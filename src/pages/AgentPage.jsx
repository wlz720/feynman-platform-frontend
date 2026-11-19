import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/axios';
import MarkdownContent from '../components/MarkdownContent';
import './AgentPage.css';

// 课时11：AI 助手 —— 基于私有知识库（RAG）的问答聊天界面
function AgentPage() {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: '你好！我是你的专属知识库 AI 助手。我会先在你的知识点里检索相关内容，再据此回答，不会凭空编造。试试问我一个与你的知识点相关的问题吧！'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const question = inputValue.trim();
    if (!question || isLoading) return;

    setMessages((prev) => [...prev, { sender: 'user', text: question }]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await apiClient.post('/ai/rag-qa', { question });
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: response.data.answer, sources: response.data.sources || [] }
      ]);
    } catch (error) {
      // 优先展示后端返回的中文错误（凭证缺失、限流、欠费等），网络中断才用兜底文案
      const backendMsg = error.response?.data?.msg;
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: backendMsg || '抱歉，连接后端失败，请确认服务已启动后稍后再试。', isError: true }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="agent-page-wrapper">
      <h1 className="agent-title">AI 助手</h1>
      <p className="agent-subtitle">
        基于你全部知识点的智能问答（RAG）：先检索、后回答，答不上来会直说，不编造。
      </p>
      <div className="agent-page">
        <div className="chat-window">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.sender}`}>
              <div className={`message-bubble${msg.isError ? ' error' : ''}`}>
                {msg.sender === 'bot' && !msg.isError ? (
                  <MarkdownContent>{msg.text}</MarkdownContent>
                ) : (
                  msg.text
                )}
                {msg.sources?.length > 0 && (
                  <div className="message-sources">
                    <span className="sources-label">引用来源：</span>
                    {msg.sources.map((source) => (
                      <Link
                        key={source.knowledgePointId}
                        to={`/kp/${source.knowledgePointId}`}
                        className="source-chip"
                        title={source.excerpt}
                      >
                        《{source.title}》
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message bot">
              <div className="message-bubble typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form className="chat-input-form" onSubmit={handleSendMessage}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="在这里输入你的问题，例如：React Hooks 有什么好处？"
            disabled={isLoading}
            maxLength={500}
          />
          <button type="submit" disabled={isLoading || !inputValue.trim()}>
            {isLoading ? '思考中...' : '发送'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AgentPage;