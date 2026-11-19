import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { GraphChart } from 'echarts/charts';
import { TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import apiClient from '../api/axios';

// 按需注册：只打包力导向图需要的模块，避免整包 echarts 撑大主 bundle
echarts.use([GraphChart, TooltipComponent, LegendComponent, CanvasRenderer]);

// 课时12：知识图谱可视化（ECharts 力导向图）
// 节点 = 知识点，边 = 引用关系（A 的正文提到了 B 的标题）。
// 课后挑战题已实现：按 status / reviewList 给节点着色。
const STATUS_COLORS = {
  mastered: '#22c55e', // 已掌握：绿
  need_review: '#f97316', // 需复习：橙
  not_started: '#8b5cf6' // 未开始：平台主题紫
};

function nodeColor(node) {
  if (node.reviewList) return STATUS_COLORS.need_review;
  return STATUS_COLORS[node.status] || STATUS_COLORS.not_started;
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
        if (!cancelled) setGraphData(response.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.msg || '获取图谱数据失败，请确认后端已启动');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const option = useMemo(
    () => ({
      tooltip: {
        formatter: (params) => {
          if (params.dataType === 'edge') {
            return '引用关系：正文中提到了该知识点的标题';
          }
          const node = params.data;
          const statusText = node.reviewList
            ? '需复习'
            : { mastered: '已掌握', need_review: '需复习', not_started: '未开始' }[node.status] || '未开始';
          const created = node.createdAt ? new Date(node.createdAt).toLocaleDateString() : '';
          return `<b>${node.name}</b><br/>状态：${statusText}${created ? `<br/>创建于：${created}` : ''}<br/>${(node.value || '').slice(0, 60)}...<br/><i>点击节点查看详情</i>`;
        }
      },
      legend: {
        data: ['已掌握', '需复习', '未开始'],
        bottom: 0,
        textStyle: { color: '#6b7280' }
      },
      series: [
        {
          type: 'graph',
          layout: 'force',
          roam: true, // 鼠标缩放和平移漫游
          draggable: true, // 拖拽节点调整布局
          categories: [
            { name: '已掌握', itemStyle: { color: STATUS_COLORS.mastered } },
            { name: '需复习', itemStyle: { color: STATUS_COLORS.need_review } },
            { name: '未开始', itemStyle: { color: STATUS_COLORS.not_started } }
          ],
          data: graphData.nodes.map((node) => ({
            ...node,
            category: node.reviewList ? 1 : node.status === 'mastered' ? 0 : node.status === 'need_review' ? 1 : 2,
            itemStyle: { color: nodeColor(node) },
            label: { show: true }
          })),
          links: graphData.links.map((link) => ({
            ...link,
            lineStyle: { color: '#c4b5fd', width: 1.5, curveness: 0.1 },
            emphasis: { lineStyle: { width: 4, color: '#8b5cf6' } }
          })),
          edgeSymbol: ['none', 'arrow'], // 引用方向：A → B
          edgeSymbolSize: 7,
          label: {
            show: true,
            position: 'right',
            formatter: '{b}',
            fontSize: 12,
            color: '#374151'
          },
          force: {
            repulsion: 220, // 节点间斥力
            edgeLength: [60, 140],
            gravity: 0.08
          },
          emphasis: {
            focus: 'adjacency', // 悬停高亮该节点及一度邻居
            lineStyle: { width: 4 }
          }
        }
      ]
    }),
    [graphData]
  );

  // 点击节点跳转到知识点详情页（比课件跳编辑页更贴合「查看」直觉）
  const onChartClick = (params) => {
    if (params.componentType === 'series' && params.dataType === 'node') {
      navigate(`/kp/${params.data.id}`);
    }
  };

  if (loading) {
    return <p style={{ color: '#6b7280' }}>正在生成知识图谱...</p>;
  }
  if (error) {
    return <p style={{ color: '#b91c1c' }}>{error}</p>;
  }

  return (
    <div>
      <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#4c1d95', margin: '0 0 6px' }}>知识图谱</h1>
      <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 16px' }}>
        展示知识点之间的引用关系（正文提到其他知识点标题即连线）。可拖拽节点、滚轮缩放；悬停高亮关联，点击节点查看详情。
        颜色：<span style={{ color: STATUS_COLORS.mastered }}>绿=已掌握</span>、
        <span style={{ color: STATUS_COLORS.need_review }}>橙=需复习</span>、
        <span style={{ color: STATUS_COLORS.not_started }}>紫=未开始</span>。
      </p>
      {graphData.nodes.length === 0 ? (
        <p style={{ color: '#6b7280' }}>还没有知识点，先去主页创建几个吧。让一个知识点的正文提到另一个的标题，就能看到连线。</p>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e5e0f5', borderRadius: 12, padding: 8 }}>
          <ReactEChartsCore
            echarts={echarts}
            option={option}
            notMerge
            style={{ height: '620px', width: '100%' }}
            onEvents={{ click: onChartClick }}
          />
        </div>
      )}
    </div>
  );
}

export default GraphPage;