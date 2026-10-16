import { useState, useEffect } from 'react'
import { getKnowledgePoints } from '../api/kpApi'

export default function KnowledgeList() {
  const [kpList, setKpList] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getKnowledgePoints()
        setKpList(res.data)
      } catch (err) {
        console.log('获取知识点失败', err)
      }
    }
    fetchData()
  }, [])

  return (
    <div style={{padding:20}}>
      <h2>我的知识点列表</h2>
      {kpList.map(item => (
        <div key={item._id} style={{border:'1px solid #ccc', margin:'10px 0', padding:10}}>
          <h3>{item.title}</h3>
          <p>{item.content}</p>
          <p>状态：{item.status}</p>
        </div>
      ))}
    </div>
  )
}
