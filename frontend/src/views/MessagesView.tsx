import React, { useEffect, useState, useRef } from 'react';
import { apiRequest } from '../utils/api';
import { Send, User as UserIcon, ShieldAlert } from 'lucide-react';

interface ChatUser {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  email: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: number;
  created_at: string;
  sender_first_name: string;
  sender_last_name: string;
  receiver_first_name?: string;
  receiver_last_name?: string;
}

interface MessagesViewProps {
  user: any;
}

export default function MessagesView({ user }: MessagesViewProps) {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewingAll, setViewingAll] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await apiRequest('/chats/users', 'GET');
        setUsers(data.filter((u: ChatUser) => u.id !== user?.id));
      } catch (err) {
        console.error('Failed to fetch chat users', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [user?.id]);

  useEffect(() => {
    if (selectedUser && !viewingAll) {
      fetchMessages(selectedUser.id);
    } else if (viewingAll && isAdmin) {
      fetchAllMessages();
    }
  }, [selectedUser, viewingAll]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async (userId: string) => {
    try {
      const data = await apiRequest(`/chats/${userId}`, 'GET');
      setMessages(data || []);
    } catch (err) {
      console.error('Failed to fetch messages', err);
    }
  };

  const fetchAllMessages = async () => {
    try {
      const data = await apiRequest(`/chats/any?admin=true`, 'GET');
      setMessages(data || []);
    } catch (err) {
      console.error('Failed to fetch all messages', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || viewingAll) return;

    try {
      await apiRequest(`/chats/${selectedUser.id}`, 'POST', { content: newMessage });
      setNewMessage('');
      fetchMessages(selectedUser.id);
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <p style={{ color: 'var(--muted-foreground)' }}>Loading directory...</p>
      </div>
    );
  }

  return (
    <div className="panel-card animate-slide-up" style={{ maxWidth: '1000px', margin: '0 auto', height: '80vh', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: 0 }}>
        <div>
          <h3 className="panel-title">Private Communications</h3>
          <p style={{ color: 'var(--muted-foreground)' }}>Secure internal messaging between medical staff.</p>
        </div>
        {isAdmin && (
          <button 
            className={`btn ${viewingAll ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => {
              setViewingAll(!viewingAll);
              setSelectedUser(null);
            }}
          >
            <ShieldAlert size={16} /> {viewingAll ? 'Exit Audit Mode' : 'Admin Audit View'}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar / Contacts */}
        {!viewingAll && (
          <div style={{ width: '300px', borderRight: '1px solid var(--border)', overflowY: 'auto' }}>
            {users.map(u => (
              <div 
                key={u.id}
                onClick={() => setSelectedUser(u)}
                style={{
                  padding: '1rem',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  background: selectedUser?.id === u.id ? 'var(--input-bg)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserIcon size={20} />
                </div>
                <div>
                  <p style={{ fontWeight: '600', color: 'var(--foreground)' }}>{u.first_name} {u.last_name}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', textTransform: 'capitalize' }}>{u.role}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--background)' }}>
          {viewingAll ? (
            <div style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
              <h4 style={{ marginBottom: '1rem', color: 'var(--destructive)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={18} /> Admin Audit Log (All Messages)
              </h4>
              {messages.length === 0 ? (
                <p style={{ color: 'var(--muted-foreground)' }}>No messages found in the system.</p>
              ) : (
                messages.map(m => (
                  <div key={m.id} style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--input-bg)', borderRadius: 'var(--radius)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: '600' }}>
                        {m.sender_first_name} {m.sender_last_name} → {m.receiver_first_name} {m.receiver_last_name}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>{new Date(m.created_at).toLocaleString()}</span>
                    </div>
                    <p>{m.content}</p>
                  </div>
                ))
              )}
            </div>
          ) : selectedUser ? (
            <>
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', background: 'var(--input-bg)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserIcon size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0 }}>{selectedUser.first_name} {selectedUser.last_name}</h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', textTransform: 'capitalize' }}>{selectedUser.role}</span>
                </div>
              </div>
              
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--muted-foreground)', marginTop: '2rem' }}>
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map(m => {
                    const isMine = m.sender_id === user?.id;
                    return (
                      <div key={m.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                        <div style={{ 
                          maxWidth: '70%', 
                          padding: '0.75rem 1rem', 
                          borderRadius: '1rem',
                          background: isMine ? 'var(--primary)' : 'var(--input-bg)',
                          color: isMine ? 'white' : 'var(--foreground)',
                          borderBottomRightRadius: isMine ? '0' : '1rem',
                          borderBottomLeftRadius: isMine ? '1rem' : '0'
                        }}>
                          <p style={{ margin: 0, lineHeight: '1.4' }}>{m.content}</p>
                          <div style={{ fontSize: '0.7rem', marginTop: '0.25rem', textAlign: isMine ? 'right' : 'left', opacity: 0.7 }}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: 'var(--input-bg)' }}>
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '1rem' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ flex: 1 }} 
                    placeholder={`Message ${selectedUser.first_name}...`}
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary" disabled={!newMessage.trim()}>
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)' }}>
              Select a user to start messaging
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
