import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { GraphChart } from 'echarts/charts';
import { TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import apiClient from '../api/axios';
import styles from './GraphPage.module.css';

echarts.use([GraphChart, TooltipComponent, LegendComponent, CanvasRenderer]);

const STATUS_COLORS = {
  mastered: '#5FB89A',
  need_review: '#E88B6F',
  not_started: '#9FB9C9',
};

function nodeColor(node) {
  if (node.reviewList) return STATUS_COLORS.need_review;
  return STATUS_COLORS[node.status] || STATUS_COLORS.not_started;
}

// Tooltip 通过 HTML 渲染，知识点标题/正文来自用户输入，必须转义，避免 XSS
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function GraphPage() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get('/graph/knowledge-map')
      .then((response) => {
        if (!cancelled) {
          setGraphData({
            nodes: response.data?.nodes || [],
            links: response.data?.links || [],
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err.response?.data?.msg || '获取图谱数据失败，请确认后端已启动'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    const nodes = graphData.nodes || [];
    return {
      mastered: nodes.filter((node) => !node.reviewList && node.status === 'mastered').length,
      need_review: nodes.filter(
        (node) => node.reviewList || node.status === 'need_review'
      ).length,
      not_started: nodes.filter(
        (node) => !node.reviewList && node.status !== 'mastered' && node.status !== 'need_review'
      ).length,
    };
  }, [graphData.nodes]);

  const option = useMemo(
    () => ({
      tooltip: {
        confine: true,
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: '#CBE8F2',
        borderWidth: 1,
        padding: [10, 12],
        textStyle: { color: '#33475B', fontSize: 12.5, lineHeight: 20 },
        extraCssText: 'box-shadow: 0 12px 30px rgba(51,71,91,.12); border-radius: 10px;',
        formatter: (params) => {
          if (params.dataType === 'edge') {
            return '<b>引用关系</b><br/>正文中提到了该知识点的标题';
          }
          const node = params.data;
          const statusText = node.reviewList
            ? '需复习'
            : { mastered: '已掌握', need_review: '需复习', not_started: '未开始' }[
                node.status
              ] || '未开始';
          const created = node.createdAt
            ? new Date(node.createdAt).toLocaleDateString('zh-CN')
            : '';
          const excerpt = String(node.value || '').slice(0, 80);
          return [
            `<b style="color:#2F6484">${escapeHtml(node.name)}</b>`,
            `状态：${escapeHtml(statusText)}${created ? ` · 创建于 ${escapeHtml(created)}` : ''}`,
            excerpt ? `${escapeHtml(excerpt)}${String(node.value || '').length > 80 ? '…' : ''}` : '',
            '<span style="color:#3E7FA6">点击节点查看详情</span>',
          ]
            .filter(Boolean)
            .join('<br/>');
        },
      },
      legend: {
        data: ['已掌握', '需复习', '未开始'],
        bottom: 8,
        icon: 'circle',
        itemWidth: 9,
        itemHeight: 9,
        textStyle: { color: '#5B7487', fontSize: 12 },
      },
      series: [
        {
          type: 'graph',
          layout: 'force',
          roam: true,
          draggable: true,
          categories: [
            { name: '已掌握', itemStyle: { color: STATUS_COLORS.mastered } },
            { name: '需复习', itemStyle: { color: STATUS_COLORS.need_review } },
            { name: '未开始', itemStyle: { color: STATUS_COLORS.not_started } },
          ],
          data: graphData.nodes.map((node) => ({
            ...node,
            category: node.reviewList
              ? 1
              : node.status === 'mastered'
                ? 0
                : node.status === 'need_review'
                  ? 1
                  : 2,
            itemStyle: {
              color: nodeColor(node),
              shadowBlur: 14,
              shadowColor: 'rgba(51, 71, 91, 0.14)',
            },
            label: { show: true },
          })),
          links: graphData.links.map((link) => ({
            ...link,
            lineStyle: { color: '#B4D2DF', width: 1.5, curveness: 0.1 },
            emphasis: { lineStyle: { width: 4, color: '#3E7FA6' } },
          })),
          edgeSymbol: ['none', 'arrow'],
          edgeSymbolSize: 7,
          label: {
            show: true,
            position: 'right',
            formatter: '{b}',
            fontSize: 11.5,
            color: '#33475B',
          },
          force: {
            repulsion: 240,
            edgeLength: [60, 140],
            gravity: 0.08,
          },
          emphasis: {
            focus: 'adjacency',
            lineStyle: { width: 4 },
          },
        },
      ],
    }),
    [graphData]
  );

  const onChartClick = (params) => {
    if (params.componentType === 'series' && params.dataType === 'node') {
      navigate(`/kp/${params.data.id}`);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="card card-pad">
          <div className="loading-block">
            <span className="spinner" />
            正在生成知识图谱…
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <h3 className="empty-title">知识图谱加载失败</h3>
          <p className="empty-text">{error}</p>
          <Link to="/" className="btn btn-primary">
            返回主页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="eyebrow">KNOWLEDGE GRAPH</span>
          <h1 className="page-title">知识图谱</h1>
          <p className="page-subtitle">
            每个节点是一个知识点，连线表示「正文提到了另一个知识点的标题」。
            拖拽节点、滚轮缩放，悬停高亮关联，点击节点进入详情。
          </p>
        </div>
        <span className="badge badge-brand">{graphData.nodes.length} 个节点</span>
      </div>

      <div className={styles.legendRow}>
        <span className={styles.legendPill}>
          <span className={styles.legendDot} style={{ background: STATUS_COLORS.mastered }} />
          已掌握 <span className={styles.legendCount}>{counts.mastered}</span>
        </span>
        <span className={styles.legendPill}>
          <span className={styles.legendDot} style={{ background: STATUS_COLORS.need_review }} />
          需复习 <span className={styles.legendCount}>{counts.need_review}</span>
        </span>
        <span className={styles.legendPill}>
          <span className={styles.legendDot} style={{ background: STATUS_COLORS.not_started }} />
          未开始 <span className={styles.legendCount}>{counts.not_started}</span>
        </span>
      </div>

      {graphData.nodes.length === 0 ? (
        <div className={styles.emptyCard}>
          <div className="empty-state">
            <div className="empty-icon">🕸️</div>
            <h3 className="empty-title">图谱还没有节点</h3>
            <p className="empty-text">
              先创建几个知识点；让一个知识点的正文提到另一个知识点的标题，就会出现连线。
            </p>
            <Link to="/kp/new" className="btn btn-primary">
              + 新建知识点
            </Link>
          </div>
        </div>
      ) : (
        <div className={styles.chartCard}>
          <div className={styles.chartHead}>
            <div className={styles.chartTitle}>
              <strong>引用关系图</strong>
              <span>节点大小与正文长度相关，颜色表示掌握状态</span>
            </div>
            <span className={styles.chartBadge}>🖱 可拖拽 · 可缩放</span>
          </div>
          <div className={styles.chartBox}>
            <ReactEChartsCore
              echarts={echarts}
              option={option}
              notMerge
              style={{ height: 'clamp(440px, 64vh, 640px)', width: '100%' }}
              onEvents={{ click: onChartClick }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default GraphPage;
