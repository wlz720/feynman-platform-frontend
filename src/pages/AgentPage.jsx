import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/axios';
import MarkdownContent from '../components/MarkdownContent';
import './AgentPage.css';

const INITIAL_MESSAGE = {
  sender: 'bot',
  text: '你好！我是你的知识库 AI 助手。我会先在你的知识点里检索相关内容，再据此回答，不会凭空编造。可以问我笔记里的概念，也可以让我对比两个容易混淆的知识点。',
};

function AgentPage() {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [kpCount, setKpCount] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncInfo, setSyncInfo] = useState('');
  const chatWindowRef = useRef(null);

  useEffect(() => {
    const el = chatWindowRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    let cancelled = false;
    const fetchKnowledgePoints = async () => {
      try {
        const res = await apiClient.get('/knowledge-points');
        if (cancelled) return;
        const list = Array.isArray(res.data) ? res.data : [];
        setKpCount(list.length);
        setSuggestions(
          list.slice(0, 3).map((kp) => ({
            id: kp._id,
            text: `《${kp.title}》的核心概念是什么？`,
          }))
        );
      } catch (err) {
        console.error('获取知识点失败', err);
      }
    };
    fetchKnowledgePoints();
    return () => {
      cancelled = true;
    };
  }, []);

  // 带上最近几轮对话历史，让模型能理解“它 / 这个概念”这类指代；报错气泡不纳入历史
  const buildHistory = (list) =>
    list
      .filter((m) => m.sender && !m.isError && typeof m.text === 'string' && m.text.trim())
      .slice(-6)
      .map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text.trim() }));

  const sendMessage = async (text) => {
    const question = text.trim();
    if (!question || isLoading) return;

    const history = buildHistory(messages);
    setMessages((prev) => [...prev, { sender: 'user', text: question }]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await apiClient.post('/ai/rag-qa', { question, history });
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: response.data.answer,
          sources: response.data.sources || [],
          mode: response.data.mode || 'rag',
        },
      ]);
    } catch (error) {
      const backendMsg = error.response?.data?.msg;
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: backendMsg || '抱歉，连接后端失败，请确认服务已启动后稍后再试。',
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // 重建当前用户的向量索引：修复保存时向量化失败导致笔记检索不到的问题
  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncInfo('');
    try {
      const res = await apiClient.post('/ai/reindex');
      setSyncInfo(`已同步 ${res.data.indexed} 个知识点，共 ${res.data.chunks} 个片段可检索`);
    } catch (error) {
      setSyncInfo(error.response?.data?.msg || '同步失败，请确认后端已启动后重试');
    } finally {
      setSyncing(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="eyebrow">RAG ASSISTANT</span>
          <h1 className="page-title">AI 助手</h1>
          <p className="page-subtitle">
            先检索你的笔记作答并附上来源；笔记里没有的问题，会标注后用通用知识回答。
          </p>
        </div>
        <span className="badge badge-brand">私有知识库 · RAG</span>
      </div>

      <div className="agentShell">
        <aside className="aside">
          <div className="infoCard">
            <h2 className="infoTitle">🧭 它是怎么回答的</h2>
            <ol className="steps">
              <li className="step">
                <span className="stepNum">1</span>
                <span className="stepText">
                  在你的知识点里<strong>检索最相关的片段</strong>。
                </span>
              </li>
              <li className="step">
                <span className="stepNum">2</span>
                <span className="stepText">
                  命中笔记就<strong>依据笔记组织回答</strong>；未命中会标注后用通用知识作答。
                </span>
              </li>
              <li className="step">
                <span className="stepNum">3</span>
                <span className="stepText">
                  在答案下方给出<strong>引用来源</strong>，可点开核对。
                </span>
              </li>
            </ol>
            <div className="kbStats">
              <span className="kbCount">{kpCount === null ? '—' : kpCount}</span>
              <span className="kbLabel">个知识点可供检索</span>
            </div>
            <button
              type="button"
              className="syncBtn"
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? '正在同步笔记…' : '🔄 同步我的笔记到知识库'}
            </button>
            {syncInfo && (
              <p className="syncInfo" role="status">
                {syncInfo}
              </p>
            )}
          </div>

          <div className="suggestionPanel">
            <h2 className="suggestionTitle">💡 试试这样问</h2>
            {suggestions.length > 0 ? (
              <div className="suggestionList">
                {suggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="suggestionBtn"
                    onClick={() => sendMessage(item.text)}
                    disabled={isLoading}
                  >
                    {item.text}
                  </button>
                ))}
              </div>
            ) : (
              <p className="suggestionEmpty">
                还没有可推荐的问题。先
                <Link to="/kp/new" style={{ color: 'var(--primary-ink)', fontWeight: 700 }}>
                  {' '}
                  新建一个知识点{' '}
                </Link>
                ，再来问它。
              </p>
            )}
          </div>
        </aside>

        <section className="chatPanel">
          <header className="chatHeader">
            <span className="botAvatar">AI</span>
            <div className="chatTitle">
              <strong>知识库助手</strong>
              <span className="onlineLine">
                <span className="onlineDot" />
                在线 · 仅依据你的笔记回答
              </span>
            </div>
            <div className="chatHeaderActions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setMessages([INITIAL_MESSAGE])}
                disabled={isLoading}
              >
                清空对话
              </button>
            </div>
          </header>

          <div className="chatWindow" ref={chatWindowRef}>
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`messageRow ${msg.sender === 'user' ? 'user' : ''}`}
              >
                <span
                  className={`avatar ${msg.sender === 'user' ? 'user' : 'bot'}`}
                  aria-hidden="true"
                >
                  {msg.sender === 'user' ? '我' : 'AI'}
                </span>
                <div
                  className={`bubble ${msg.sender === 'user' ? 'user' : 'bot'} ${
                    msg.isError ? 'error' : ''
                  }`}
                >
                  {msg.sender === 'bot' && !msg.isError ? (
                    <MarkdownContent>{msg.text}</MarkdownContent>
                  ) : (
                    msg.text
                  )}
                  {msg.mode === 'general' && !msg.isError && (
                    <div className="modeNote">未在你的笔记中检索到相关内容，以下为通用解答</div>
                  )}
                  {msg.sources?.length > 0 && (
                    <div className="sources">
                      <span>引用来源：</span>
                      {msg.sources.map((source, sourceIndex) => (
                        <Link
                          key={source.knowledgePointId || sourceIndex}
                          to={`/kp/${source.knowledgePointId}`}
                          className="sourceChip"
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
              <div className="typingRow">
                <span className="avatar bot" aria-hidden="true">
                  AI
                </span>
                <div className="typingIndicator">
                  <span />
                  <span />
                  <span />
                </div>
                <span className="typingLabel">正在检索知识库…</span>
              </div>
            )}
          </div>

          <form className="composer" onSubmit={handleSendMessage}>
            <div className="inputBox">
              <textarea
                className="composerInput"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入你的问题，例如：React Hooks 有什么好处？"
                disabled={isLoading}
                maxLength={500}
                rows={1}
                aria-label="向知识库提问"
              />
              <div className="inputMeta">
                <span>Enter 发送 · Shift + Enter 换行</span>
                <span>{inputValue.length} / 500</span>
              </div>
            </div>
            <button
              type="submit"
              className="sendBtn"
              disabled={isLoading || !inputValue.trim()}
            >
              {isLoading ? '思考中…' : '发送 →'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default AgentPage;
