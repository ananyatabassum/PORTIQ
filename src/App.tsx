import { useState, useEffect, useRef, useCallback } from 'react'

// ── Demo credentials ─────────────────────────────────────────────────
const DEMO_USER = 'user1'
const DEMO_PASS = '12345'

// ── Colour tokens ────────────────────────────────────────────────────
const c = {
  bg:        '#07091a',
  sidebar:   '#0b1220',
  card:      '#0f1929',
  cardHi:    '#12203a',
  border:    '#1a2a3d',
  borderHi:  '#243a52',
  cyan:      '#00d9ff',
  cyanDim:   '#0097b2',
  green:     '#22c55e',
  purple:    '#a855f7',
  orange:    '#f59e0b',
  red:       '#ef4444',
  yellow:    '#eab308',
  blue:      '#3b82f6',
  text:      '#e2e8f0',
  textSub:   '#94a3b8',
  textMute:  '#4b5e72',
  activeBg:  '#0e243f',
  activeText:'#22d3ee',
  inputBg:   '#0c1828',
}

// ── Types ─────────────────────────────────────────────────────────────
type Nav = 'overview'|'yardmap'|'containers'|'craneops'|'optimization'|'analytics'|'alerts'|'reports'|'settings'
type YardFlow = 'idle'|'selected'|'blocking'|'optimizing'|'optimized'|'routing'|'applied'

// ── Helpers ───────────────────────────────────────────────────────────
function pad(n: number){ return String(n).padStart(2,'0') }
function useTick(){
  const [now,setNow]=useState(new Date())
  useEffect(()=>{ const t=setInterval(()=>setNow(new Date()),1000); return ()=>clearInterval(t) },[])
  return now
}
function shadeHex(hex:string,f:number):string{
  const n=parseInt(hex.replace('#',''),16)
  const r=Math.min(255,Math.round(((n>>16)&255)*f))
  const g=Math.min(255,Math.round(((n>>8)&255)*f))
  const b=Math.min(255,Math.round((n&255)*f))
  return `rgb(${r},${g},${b})`
}

// ════════════════════════════════════════════════════════════════════
//  TOAST SYSTEM
// ════════════════════════════════════════════════════════════════════
type ToastMsg = { id:number; text:string; sub?:string; color?:string }
let toastId = 0
const toastListeners: ((t:ToastMsg[])=>void)[] = []
let toastQueue: ToastMsg[] = []
function showToast(text:string, sub?:string, color?:string){
  const id=++toastId
  toastQueue=[...toastQueue,{id,text,sub,color}]
  toastListeners.forEach(fn=>fn(toastQueue))
  setTimeout(()=>{
    toastQueue=toastQueue.filter(t=>t.id!==id)
    toastListeners.forEach(fn=>fn(toastQueue))
  },4000)
}
function useToasts(){
  const [toasts,setToasts]=useState<ToastMsg[]>([])
  useEffect(()=>{
    toastListeners.push(setToasts)
    return ()=>{ const i=toastListeners.indexOf(setToasts); if(i>-1) toastListeners.splice(i,1) }
  },[])
  return toasts
}

function ToastLayer(){
  const toasts=useToasts()
  return (
    <div style={{position:'fixed',bottom:28,right:24,zIndex:9999,display:'flex',flexDirection:'column',gap:8,pointerEvents:'none'}}>
      {toasts.map(t=>(
        <div key={t.id} style={{
          background:c.card,border:`1px solid ${t.color||c.green}`,borderRadius:10,
          padding:'12px 18px',boxShadow:`0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${t.color||c.green}33`,
          minWidth:280,animation:'slideUp 0.3s ease',
        }}>
          <div style={{fontWeight:700,fontSize:13,color:t.color||c.green}}>✓ {t.text}</div>
          {t.sub&&<div style={{fontSize:11,color:c.textSub,marginTop:2}}>{t.sub}</div>}
        </div>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
//  ISOMETRIC YARD
// ════════════════════════════════════════════════════════════════════
const HW=17, QH=10, BH=13

function isoP(col:number,row:number,lev:number){ return {x:(col-row)*HW, y:(col+row)*QH-lev*BH} }
function pts(arr:{x:number,y:number}[]){ return arr.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') }

type BoxSpec = { col:number; row:number; lev:number; baseColor:string; glow?:boolean; label?:string; pulseColor?:string }

function IsoBox({col,row,lev,baseColor,glow,pulseColor}:BoxSpec){
  const A=isoP(col,  row,  lev),  B=isoP(col+1,row,  lev)
  const D=isoP(col,  row+1,lev)
  const E=isoP(col,  row,  lev+1),F=isoP(col+1,row,  lev+1)
  const G=isoP(col+1,row+1,lev+1),H=isoP(col,  row+1,lev+1)
  const topC  = baseColor
  const leftC = shadeHex(baseColor,0.72)
  const rightC= shadeHex(baseColor,0.52)
  const stroke= glow ? (pulseColor||'#a855f7') : '#080e1c'
  const sw    = glow ? 1.5 : 0.5
  return (
    <g>
      {glow&&<polygon points={pts([E,F,G,H])} fill="none" stroke={pulseColor||'#a855f7'} strokeWidth="4" opacity="0.5" filter="url(#glow)"/>}
      <polygon points={pts([A,B,F,E])} fill={leftC}  stroke={stroke} strokeWidth={sw}/>
      <polygon points={pts([B,isoP(col+1,row+1,lev),G,F])} fill={rightC} stroke={stroke} strokeWidth={sw}/>
      <polygon points={pts([E,F,G,H])} fill={topC}   stroke={stroke} strokeWidth={sw}/>
    </g>
  )
}

// Block definitions: col offset, row offset, height grid [row][bay]
const BLOCK_DEFS = [
  { id:'A01', co:0,  ro:0,  label:'BLOCK A01',
    grid:[[3,4,4,3,2],[4,3,4,3,3],[3,4,3,4,2],[2,3,4,3,3]],
    colFn:(b:number,r:number,l:number,h:number)=>
      l===h-1&&(b===1||b===3)?'#1a5c35':'#1e4280',
  },
  { id:'A02', co:7,  ro:0,  label:'BLOCK A02',
    grid:[[2,3,3,2,2],[3,4,3,3,2],[3,3,4,3,3],[2,3,3,2,2]],
    colFn:(_b:number,_r:number,_l:number,_h:number)=>'#1a5c35',
  },
  { id:'A03', co:14, ro:0,  label:'BLOCK A03',
    grid:[[4,5,5,4,4],[5,4,5,5,4],[4,5,4,5,4],[4,4,5,4,3]],
    colFn:(_b:number,_r:number,l:number,h:number)=>l===h-1?'#7a4010':'#7a3a10',
  },
  { id:'B01', co:0,  ro:6,  label:'BLOCK B01',
    grid:[[2,3,3,2,2],[3,3,2,3,2],[2,3,3,2,3],[2,2,3,2,2]],
    colFn:(_b:number,_r:number,_l:number,_h:number)=>'#1e4280',
  },
  { id:'B02', co:7,  ro:6,  label:'BLOCK B02',
    grid:[[3,4,3,3,2],[4,3,4,3,3],[3,4,3,3,2],[2,3,3,2,2]],
    colFn:(_b:number,_r:number,l:number,h:number)=>l===h-1?'#1a5c35':'#1e4280',
  },
  { id:'B03', co:14, ro:6,  label:'BLOCK B03',
    grid:[[2,3,4,3,2],[3,4,5,4,3],[2,4,5,4,2],[2,3,3,2,2]],
    colFn:(b:number,r:number,l:number,h:number)=>{
      if(b===2&&r===1&&l===h-1) return '#5a1a8a'  // CNU-48291 (purple)
      if(b===1&&r===1&&l===h-1) return '#7a1a1a'  // CNU-48281 blocking
      if(b===2&&r===0&&l===h-1) return '#7a1a1a'  // CNU-48275 blocking
      return '#1e4280'
    },
  },
  { id:'C01', co:0,  ro:12, label:'BLOCK C01',
    grid:[[2,2,3,2,2],[2,3,2,3,2],[2,2,3,2,2]],
    colFn:(_b:number,_r:number,_l:number,_h:number)=>'#1e4280',
  },
]

type YardProps = { flow: YardFlow; onSelectTarget:()=>void; applied:boolean }

function IsometricYard({flow,onSelectTarget,applied}:YardProps){
  const [hoverId,setHoverId]=useState<string|null>(null)

  // Generate all box specs
  const boxes:BoxSpec[] = []
  for(const blk of BLOCK_DEFS){
    for(let r=0;r<blk.grid.length;r++){
      for(let b=0;b<blk.grid[r].length;b++){
        const h=blk.grid[r][b]
        for(let l=0;l<h;l++){
          const col=blk.co+b, row=blk.ro+r
          let baseColor = blk.colFn(b,r,l,h)
          // After applied: blocking containers become green
          const isBlocking = blk.id==='B03'&&((b===1&&r===1&&l===h-1)||(b===2&&r===0&&l===h-1))
          const isTarget   = blk.id==='B03'&&b===2&&r===1&&l===h-1
          if(applied&&isBlocking) baseColor='#1a5c35'
          const glow = isTarget&&flow!=='idle'
          const pulseColor = applied&&isTarget ? '#22c55e' : '#a855f7'
          boxes.push({ col, row, lev:l, baseColor, glow, pulseColor,
            label: isTarget?'CNU-48291':undefined })
        }
      }
    }
  }
  // Sort: back to front (higher col+row first = drawn first = appears behind)
  boxes.sort((a,b)=>{
    const da=a.col+a.row, db=b.col+b.row
    if(da!==db) return da-db
    return a.lev-b.lev
  })

  // Crane SVG elements
  function Crane({col,row,lev}:{col:number,row:number,lev:number}){
    const base=isoP(col+0.5,row+0.5,lev)
    return (
      <g opacity="0.9">
        <line x1={base.x} y1={base.y} x2={base.x} y2={base.y-28} stroke="#c0d8f0" strokeWidth="2"/>
        <line x1={base.x-18} y1={base.y-28} x2={base.x+18} y2={base.y-28} stroke="#c0d8f0" strokeWidth="1.5"/>
        <line x1={base.x+18} y1={base.y-28} x2={base.x+18} y2={base.y-20} stroke="#c0d8f0" strokeWidth="1.5"/>
        <circle cx={base.x} cy={base.y-28} r="2.5" fill={c.cyan}/>
        <circle cx={base.x+18} cy={base.y-20} r="2" fill={c.orange}/>
      </g>
    )
  }

  // Roads
  function RoadLine({c1,r1,c2,r2}:{c1:number,r1:number,c2:number,r2:number}){
    const p1=isoP(c1,r1,0), p2=isoP(c2,r2,0)
    return <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#1a2e42" strokeWidth="8" strokeLinecap="round"/>
  }

  // Route path (for routing/applied state)
  const routeStart = isoP(8, 7, 4)  // CRANE-04 position
  const routeEnd   = isoP(16, 7, 0) // gate area
  const target     = isoP(16, 7, 4) // CNU-48291

  // Block label
  function BlockLabel({blk}:{blk:typeof BLOCK_DEFS[0]}){
    const topP = isoP(blk.co + blk.grid[0].length/2, blk.ro, 6)
    return (
      <text x={topP.x} y={topP.y-10} textAnchor="middle"
        fill="#3a6080" fontSize="8" fontFamily="monospace" fontWeight="700" letterSpacing="1">
        {blk.label}
      </text>
    )
  }

  // Selected container tooltip
  const cnu = isoP(16, 7, 5)

  const showRoute = flow==='routing'||flow==='applied'

  return (
    <svg viewBox="-310 -90 720 420" style={{width:'100%',height:'100%',display:'block'}}
      preserveAspectRatio="xMidYMid meet">
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="glowCyan">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Road grid */}
      <RoadLine c1={0} r1={5} c2={22} r2={5}/>
      <RoadLine c1={0} r1={11} c2={22} r2={11}/>
      <RoadLine c1={6} r1={0} c2={6} r2={17}/>
      <RoadLine c1={13} r1={0} c2={13} r2={17}/>

      {/* Block labels (behind containers) */}
      {BLOCK_DEFS.map(blk=><BlockLabel key={blk.id} blk={blk}/>)}

      {/* All containers */}
      {boxes.map((box,i)=>(
        <g key={i}
          onClick={()=>{ if(box.label==='CNU-48291') onSelectTarget() }}
          style={{cursor:box.label?'pointer':'default'}}
        >
          <IsoBox {...box}/>
        </g>
      ))}

      {/* Cranes */}
      <Crane col={2} row={1} lev={4}/>
      <Crane col={9} row={2} lev={4}/>
      <Crane col={16} row={8} lev={4}/>

      {/* Route path */}
      {showRoute && (
        <>
          <line
            x1={routeStart.x} y1={routeStart.y}
            x2={target.x} y2={target.y}
            stroke={c.cyan} strokeWidth="2" strokeDasharray="6 4" opacity="0.7"
          />
          <circle cx={target.x} cy={target.y} r="8" fill="none" stroke={c.cyan} strokeWidth="2" opacity="0.6">
            <animate attributeName="r" from="8" to="16" dur="1.5s" repeatCount="indefinite"/>
            <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite"/>
          </circle>
          <line
            x1={target.x} y1={target.y}
            x2={routeEnd.x+60} y2={routeEnd.y+30}
            stroke={c.green} strokeWidth="2" strokeDasharray="6 4" opacity="0.7"
          />
          <text x={routeEnd.x+70} y={routeEnd.y+35} fill={c.green} fontSize="9" fontFamily="monospace" fontWeight="700">GATE 02</text>
        </>
      )}

      {/* Selected container tooltip */}
      {flow!=='idle' && (
        <g transform={`translate(${cnu.x-52},${cnu.y-60})`}>
          <rect x="0" y="0" width="104" height="52" rx="5"
            fill="#1a1040" stroke={applied?c.green:'#a855f7'} strokeWidth="1.5" opacity="0.95"/>
          <text x="52" y="13" textAnchor="middle" fill={applied?c.green:'#c084fc'} fontSize="9" fontWeight="800" fontFamily="monospace">CNU-48291</text>
          <text x="52" y="24" textAnchor="middle" fill="#e2b96f" fontSize="7" fontFamily="monospace">{applied?'✓ RETRIEVAL IN PROGRESS':'HIGH PRIORITY'}</text>
          <text x="52" y="34" textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="monospace">B03 · BAY 17 · ROW 04 · LVL 05</text>
          <text x="52" y="45" textAnchor="middle" fill={c.cyan} fontSize="7" fontFamily="monospace">{applied?'CRANE-04 · ETA 6m 24s':'CRANE-04 ASSIGNED'}</text>
          {/* connector line */}
          <line x1="52" y1="52" x2="52" y2="64" stroke={applied?c.green:'#a855f7'} strokeWidth="1.5" strokeDasharray="2 2"/>
        </g>
      )}

      {/* Truck icons (small rectangles on roads) */}
      {[{c:3,r:5},{c:10,r:11},{c:17,r:5}].map((t,i)=>{
        const p=isoP(t.c,t.r,0)
        return <rect key={i} x={p.x-5} y={p.y-3} width="10" height="6" rx="1.5"
          fill={i===2?c.cyan:'#3a5a7a'} opacity="0.9"/>
      })}
    </svg>
  )
}

// ════════════════════════════════════════════════════════════════════
//  CONTAINER INSPECTOR
// ════════════════════════════════════════════════════════════════════
type InspectorProps = {
  flow: YardFlow
  setFlow: (f:YardFlow)=>void
  applied: boolean
  setApplied:(b:boolean)=>void
  onOptimize:()=>void
}

function ContainerInspector({flow,setFlow,applied,setApplied,onOptimize}:InspectorProps){
  const panelStyle={
    width:292,flexShrink:0,background:c.sidebar,borderLeft:`1px solid ${c.border}`,
    overflowY:'auto' as const,display:'flex',flexDirection:'column' as const,gap:0,
    fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",
  }
  const sectionStyle={padding:'14px 18px',borderBottom:`1px solid ${c.border}`}

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{...sectionStyle,paddingBottom:12}}>
        <div style={{fontSize:10,color:c.textMute,letterSpacing:2,fontWeight:700,marginBottom:8}}>CONTAINER INSPECTOR</div>
        <div style={{fontSize:20,fontWeight:800,color:c.text,fontFamily:'monospace',marginBottom:4}}>CNU-48291</div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <div style={{width:7,height:7,borderRadius:'50%',background:applied?c.green:'#a855f7',boxShadow:`0 0 6px ${applied?c.green:'#a855f7'}`}}/>
          <span style={{fontSize:10,fontWeight:700,color:applied?c.green:'#c084fc',letterSpacing:1}}>
            {applied?'RETRIEVAL IN PROGRESS':'READY FOR RETRIEVAL'}
          </span>
        </div>
      </div>

      {/* Location */}
      <div style={sectionStyle}>
        <div style={{fontSize:9,color:c.textMute,letterSpacing:2,fontWeight:700,marginBottom:10}}>LOCATION</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {[['BLOCK','B03'],['BAY','17'],['ROW','04'],['LEVEL','05']].map(([l,v])=>(
            <div key={l}>
              <div style={{fontSize:9,color:c.textMute,letterSpacing:1,marginBottom:3}}>{l}</div>
              <div style={{fontSize:14,fontWeight:800,color:c.text,fontFamily:'monospace'}}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Cargo */}
      <div style={sectionStyle}>
        <div style={{fontSize:9,color:c.textMute,letterSpacing:2,fontWeight:700,marginBottom:10}}>CARGO</div>
        <div style={{fontSize:12,color:c.textSub,marginBottom:4}}>40FT Dry Container</div>
        <div style={{fontSize:12,color:c.textSub,marginBottom:4}}>18.4 t</div>
        <div style={{fontSize:12,color:c.textSub}}>Destination: <span style={{color:c.cyan}}>Singapore</span></div>
      </div>

      {/* Operation */}
      <div style={sectionStyle}>
        <div style={{fontSize:9,color:c.textMute,letterSpacing:2,fontWeight:700,marginBottom:10}}>OPERATION</div>
        <div style={{display:'flex',flexDirection:'column',gap:7}}>
          {[['Priority','HIGH','#ef4444'],['Crane','CRANE-04',c.cyan],['ETA',applied?'6m 24s':'8m 42s',applied?c.green:c.textSub]].map(([l,v,col])=>(
            <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:11,color:c.textMute}}>{l}</span>
              <span style={{fontSize:12,fontWeight:700,color:col,fontFamily:'monospace'}}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Blocking */}
      {['blocking','optimizing','optimized','routing','applied'].includes(flow) && (
        <div style={sectionStyle}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <span style={{fontSize:9,color:applied?c.green:c.red,letterSpacing:2,fontWeight:700}}>
              {applied?'✓ BLOCKING CLEARED':'⚠ RETRIEVAL BLOCKED'}
            </span>
          </div>
          {!applied && <div style={{fontSize:11,color:c.textSub,marginBottom:10}}>2 containers are blocking this container.</div>}
          {[{id:'CNU-48275',level:'Level 06'},{id:'CNU-48281',level:'Level 05'}].map(b=>(
            <div key={b.id} style={{
              display:'flex',alignItems:'center',gap:8,padding:'8px 0',
              borderBottom:`1px solid ${c.border}`,opacity:applied?0.4:1,
            }}>
              <div style={{width:6,height:6,borderRadius:'50%',background:applied?c.green:c.red,flexShrink:0}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:11,fontFamily:'monospace',fontWeight:700,color:c.text}}>{b.id}</div>
                <div style={{fontSize:9,color:c.textMute}}>{b.level} · Temporary move required</div>
              </div>
              {applied&&<span style={{fontSize:9,color:c.green,fontWeight:700}}>moved ✓</span>}
            </div>
          ))}
        </div>
      )}

      {/* Plan comparison */}
      {['optimized','routing','applied'].includes(flow) && (
        <div style={sectionStyle}>
          <div style={{fontSize:9,color:c.textMute,letterSpacing:2,fontWeight:700,marginBottom:12}}>PLAN COMPARISON</div>
          <div style={{display:'flex',gap:8,marginBottom:10}}>
            {[{l:'CURRENT',v:'8m 42s',col:c.textSub},{l:'OPTIMIZED',v:'6m 24s',col:c.cyan},{l:'SAVED',v:'2m 18s',col:c.green}].map(s=>(
              <div key={s.l} style={{flex:1,background:c.cardHi,borderRadius:8,padding:'10px 8px',textAlign:'center'}}>
                <div style={{fontSize:8,color:c.textMute,letterSpacing:1,marginBottom:6}}>{s.l}</div>
                <div style={{fontSize:13,fontWeight:800,color:s.col,fontFamily:'monospace'}}>{s.v}</div>
              </div>
            ))}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0'}}>
            <span style={{fontSize:11,color:c.textMute}}>Moves reduced</span>
            <span style={{fontSize:12,fontWeight:700,color:c.purple,fontFamily:'monospace'}}>3 → 2</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{padding:'14px 18px',display:'flex',flexDirection:'column',gap:8}}>
        {flow==='selected' && (
          <button onClick={()=>setFlow('blocking')}
            style={{padding:'11px',background:'rgba(239,68,68,0.1)',border:`1px solid ${c.red}`,borderRadius:8,color:c.red,fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:'inherit',letterSpacing:0.5}}>
            IDENTIFY BLOCKING CONTAINERS
          </button>
        )}
        {flow==='blocking' && (
          <button onClick={onOptimize}
            style={{padding:'12px',background:`linear-gradient(135deg,${c.green},#059669)`,border:'none',borderRadius:8,color:'white',fontWeight:800,fontSize:13,cursor:'pointer',fontFamily:'inherit',letterSpacing:0.5,boxShadow:`0 0 20px rgba(34,197,94,0.3)`}}>
            ⚡ OPTIMIZE RETRIEVAL
          </button>
        )}
        {flow==='optimized' && (
          <>
            <button onClick={()=>setFlow('routing')}
              style={{padding:'11px',background:'rgba(0,217,255,0.1)',border:`1px solid ${c.cyan}`,borderRadius:8,color:c.cyan,fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>
              PREVIEW ROUTE
            </button>
          </>
        )}
        {flow==='routing' && (
          <button onClick={()=>{setFlow('applied');setApplied(true);showToast('Optimization applied','Estimated retrieval time reduced by 2m 18s.')}}
            style={{padding:'12px',background:`linear-gradient(135deg,${c.green},#059669)`,border:'none',borderRadius:8,color:'white',fontWeight:800,fontSize:13,cursor:'pointer',fontFamily:'inherit',boxShadow:`0 0 20px rgba(34,197,94,0.3)`}}>
            ✓ APPLY OPTIMIZATION
          </button>
        )}
        {applied && (
          <div style={{padding:'11px',background:'rgba(34,197,94,0.08)',border:`1px solid ${c.green}`,borderRadius:8,textAlign:'center'}}>
            <div style={{color:c.green,fontWeight:800,fontSize:13}}>✓ OPTIMIZATION APPLIED</div>
            <div style={{color:c.textMute,fontSize:10,marginTop:4}}>CRANE-04 dispatched · ETA 6m 24s</div>
          </div>
        )}
        {(flow==='idle'||flow==='selected') && !applied && flow!=='selected' && (
          <div style={{fontSize:11,color:c.textMute,textAlign:'center',padding:'8px 0'}}>
            Click CNU-48291 in yard to inspect
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
//  OPTIMIZATION MODAL
// ════════════════════════════════════════════════════════════════════
function OptModal({flow,setFlow,setApplied,onClose}:{flow:YardFlow;setFlow:(f:YardFlow)=>void;setApplied:(b:boolean)=>void;onClose:()=>void}){
  const steps = [
    {n:'01',action:'MOVE CNU-48275',sub:'CRANE-04 → Bay 12, Row 02',time:'1m 42s'},
    {n:'02',action:'MOVE CNU-48281',sub:'CRANE-04 → Bay 12, Row 03',time:'1m 35s'},
    {n:'03',action:'RETRIEVE CNU-48291',sub:'CRANE-04 → Gate 02',time:'3m 07s'},
  ]
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={onClose}>
      <div style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:16,padding:28,width:500,boxShadow:'0 32px 80px rgba(0,0,0,0.7)',fontFamily:"'Inter','Segoe UI',system-ui,sans-serif"}}
        onClick={e=>e.stopPropagation()}>
        <div style={{marginBottom:20}}>
          <div style={{fontSize:18,fontWeight:800,color:c.text}}>OPTIMIZED RETRIEVAL PLAN</div>
          <div style={{fontSize:11,color:c.textMute,marginTop:3}}>Container CNU-48291 · Block B03 · Bay 17</div>
        </div>
        {/* Timeline */}
        <div style={{display:'flex',flexDirection:'column',gap:0,marginBottom:20}}>
          {steps.map((s,i)=>(
            <div key={s.n}>
              <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:c.cardHi,borderRadius:8,border:`1px solid ${c.border}`}}>
                <div style={{width:26,height:26,borderRadius:'50%',background:i===2?c.green:'#1e3a5f',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:i===2?'white':c.textSub,flexShrink:0}}>{s.n}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:c.text}}>{s.action}</div>
                  <div style={{fontSize:10,color:c.textMute}}>{s.sub}</div>
                </div>
                <div style={{fontSize:12,fontFamily:'monospace',fontWeight:700,color:i===2?c.green:c.cyan}}>{s.time}</div>
              </div>
              {i<2&&<div style={{display:'flex',justifyContent:'center',padding:'4px 0'}}><div style={{width:1,height:10,background:c.border}}/></div>}
            </div>
          ))}
        </div>
        {/* Comparison */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20}}>
          {[{l:'CURRENT',v:'8m 42s',col:c.textSub},{l:'OPTIMIZED',v:'6m 24s',col:c.cyan},{l:'TIME SAVED',v:'2m 18s',col:c.green},{l:'MOVES',v:'3 → 2',col:c.purple}].map(s=>(
            <div key={s.l} style={{background:'#0a1525',borderRadius:8,padding:'10px 0',textAlign:'center',border:`1px solid ${c.border}`}}>
              <div style={{fontSize:8,color:c.textMute,letterSpacing:1,marginBottom:5}}>{s.l}</div>
              <div style={{fontSize:14,fontWeight:800,color:s.col,fontFamily:'monospace'}}>{s.v}</div>
            </div>
          ))}
        </div>
        {/* Buttons */}
        <div style={{display:'flex',gap:10}}>
          <button onClick={()=>{setFlow('routing');onClose()}}
            style={{flex:1,padding:'11px',background:'rgba(0,217,255,0.1)',border:`1px solid ${c.cyan}`,borderRadius:8,color:c.cyan,fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>
            PREVIEW ROUTE
          </button>
          <button onClick={()=>{setFlow('applied');setApplied(true);onClose();showToast('Optimization applied','Estimated retrieval time reduced by 2m 18s.')}}
            style={{flex:1,padding:'11px',background:`linear-gradient(135deg,${c.green},#059669)`,border:'none',borderRadius:8,color:'white',fontWeight:800,fontSize:13,cursor:'pointer',fontFamily:'inherit',boxShadow:`0 0 20px rgba(34,197,94,0.3)`}}>
            APPLY OPTIMIZATION
          </button>
          <button onClick={onClose}
            style={{padding:'11px 18px',background:'transparent',border:`1px solid ${c.border}`,borderRadius:8,color:c.textSub,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>
            CANCEL
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
//  HEADER
// ════════════════════════════════════════════════════════════════════
const NOTIFICATIONS = [
  {id:1,level:'CRITICAL',title:'CNU-48291 retrieval blocked',desc:'3 containers blocking in Block B03',time:'2 min ago',color:'#ef4444',read:false},
  {id:2,level:'WARNING', title:'CRANE-03 maintenance scheduled',desc:'Maintenance window in 45 minutes',time:'18 min ago',color:'#f59e0b',read:false},
  {id:3,level:'INFO',    title:'Optimization complete – Block B03',desc:'Retrieval plan updated',time:'1 hr ago',color:'#22d3ee',read:true},
  {id:4,level:'SUCCESS', title:'Retrieval route optimized',desc:'CNU-48291 path confirmed',time:'1 hr ago',color:'#22c55e',read:true},
]

const FAQ_ITEMS = [
  {q:'How do I search for a container?',a:'Use the search bar in the top header. Type a container ID (e.g. CNU-48291) and press Enter or click Search. The yard will automatically highlight the container.'},
  {q:'How do I locate a container in the yard?',a:'After searching, the 3D isometric yard will scroll to the container and highlight it with a purple/cyan glow. A tooltip shows its exact block, bay, row, and level.'},
  {q:'How does retrieval optimization work?',a:'Select a container, identify its blocking containers, then click "Optimize Retrieval". The AI engine calculates the fastest retrieval path, reducing crane moves and travel time.'},
  {q:'How do I preview a crane route?',a:'After accepting an optimization plan, click "Preview Route". The yard will display an animated path showing CRANE-04\'s movement from its current position to the target container.'},
  {q:'How do I apply an optimization?',a:'Click "Apply Optimization" in the optimization modal. CRANE-04 will be dispatched immediately and the status will update to show retrieval in progress.'},
  {q:'What does a blocked container mean?',a:'A blocked container has one or more containers stacked on top of it or positioned in the crane\'s access lane. These must be temporarily relocated before retrieval can begin.'},
  {q:'What do yard colors mean?',a:'Blue = Normal. Green = Optimized/cleared. Amber = Attention/near capacity. Red = Blocked. Purple/Cyan = Selected target container. White = RTG crane.'},
]

type HeaderProps = { title:string; searchValue:string; onSearch:(v:string)=>void; onSearchSubmit:()=>void; onNavYard:()=>void }

function Header({title,searchValue,onSearch,onSearchSubmit,onNavYard}:HeaderProps){
  const now=useTick()
  const timeStr=`${pad(now.getHours())}:${pad(now.getMinutes())}`
  const dateStr=now.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})
  const [showNotif,setShowNotif]=useState(false)
  const [showHelp,setShowHelp]=useState(false)
  const [showUser,setShowUser]=useState(false)
  const [readIds,setReadIds]=useState<number[]>([3,4])
  const [openFaq,setOpenFaq]=useState<number|null>(null)
  const [showSearchDrop,setShowSearchDrop]=useState(false)
  const unread=NOTIFICATIONS.filter(n=>!readIds.includes(n.id)).length

  function markRead(id:number){ setReadIds(p=>[...p.filter(x=>x!==id),id]) }

  const searchMatch = searchValue.length>=2 && 'CNU-48291'.toUpperCase().includes(searchValue.toUpperCase())

  return (
    <div style={{height:56,background:c.sidebar,borderBottom:`1px solid ${c.border}`,display:'flex',alignItems:'center',padding:'0 18px',gap:14,flexShrink:0,fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",position:'relative',zIndex:200}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:700,color:c.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{title}</div>
        <div style={{display:'flex',alignItems:'center',gap:7,marginTop:1}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:c.green}}/>
          <span style={{fontSize:10,color:c.green,fontWeight:600}}>System Operational</span>
          <span style={{fontSize:10,color:c.textMute}}>•</span>
          <span style={{fontSize:10,color:c.cyan,fontWeight:700}}>LIVE</span>
          <span style={{fontSize:10,color:c.textMute}}>• Updated just now</span>
        </div>
      </div>

      {/* Search */}
      <div style={{position:'relative'}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c.textMute} strokeWidth="2"
          style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)'}}>
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input value={searchValue}
          onChange={e=>{onSearch(e.target.value);setShowSearchDrop(true)}}
          onKeyDown={e=>{if(e.key==='Enter'){setShowSearchDrop(false);onSearchSubmit()}}}
          onFocus={()=>setShowSearchDrop(true)}
          onBlur={()=>setTimeout(()=>setShowSearchDrop(false),200)}
          placeholder="Search container ID, bay…"
          style={{background:c.inputBg,border:`1px solid ${c.border}`,borderRadius:8,color:c.text,fontSize:12,padding:'6px 10px 6px 28px',width:210,outline:'none',fontFamily:'inherit'}}/>
        {showSearchDrop && searchMatch && (
          <div style={{position:'absolute',top:'100%',left:0,marginTop:4,background:c.card,border:`1px solid ${c.borderHi}`,borderRadius:8,padding:0,minWidth:250,boxShadow:'0 8px 24px rgba(0,0,0,0.5)',zIndex:500,overflow:'hidden'}}>
            <div onClick={()=>{setShowSearchDrop(false);onSearchSubmit();onNavYard()}} style={{padding:'10px 14px',cursor:'pointer',borderBottom:`1px solid ${c.border}`}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.cyan} strokeWidth="2"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:c.text,fontFamily:'monospace'}}>CNU-48291</div>
                  <div style={{fontSize:10,color:c.textMute}}>Block B03 · Bay 17 · Row 04 · Level 05</div>
                </div>
                <span style={{marginLeft:'auto',fontSize:9,fontWeight:700,color:c.red,background:'rgba(239,68,68,0.1)',padding:'2px 7px',borderRadius:8}}>HIGH PRIORITY</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Time */}
      <div style={{textAlign:'right',flexShrink:0}}>
        <div style={{fontSize:15,fontWeight:700,color:c.text,fontFamily:'monospace'}}>{timeStr}</div>
        <div style={{fontSize:10,color:c.textSub}}>{dateStr}</div>
      </div>

      {/* Notification bell */}
      <div style={{position:'relative'}}>
        <button onClick={()=>{setShowNotif(p=>!p);setShowHelp(false);setShowUser(false)}}
          style={{background:'none',border:'none',cursor:'pointer',color:c.textSub,padding:6,position:'relative',display:'flex'}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
          {unread>0&&<span style={{position:'absolute',top:2,right:2,width:8,height:8,borderRadius:'50%',background:c.red,fontSize:0}}/>}
        </button>
        {showNotif&&(
          <div style={{position:'absolute',right:0,top:'100%',marginTop:6,background:c.card,border:`1px solid ${c.border}`,borderRadius:12,width:320,boxShadow:'0 16px 40px rgba(0,0,0,0.5)',zIndex:400}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 16px',borderBottom:`1px solid ${c.border}`}}>
              <span style={{fontWeight:700,color:c.text,fontSize:13}}>Notifications</span>
              <span style={{fontSize:10,color:c.textMute}}>{unread} unread</span>
            </div>
            {NOTIFICATIONS.map(n=>(
              <div key={n.id} onClick={()=>markRead(n.id)}
                style={{padding:'11px 16px',borderBottom:`1px solid ${c.border}`,cursor:'pointer',background:readIds.includes(n.id)?'transparent':'rgba(255,255,255,0.02)'}}>
                <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:n.color,marginTop:3,flexShrink:0,boxShadow:`0 0 6px ${n.color}`}}/>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
                      <span style={{fontSize:10,fontWeight:700,color:n.color,letterSpacing:0.5}}>{n.level}</span>
                      <span style={{fontSize:9,color:c.textMute}}>{n.time}</span>
                    </div>
                    <div style={{fontSize:12,fontWeight:600,color:c.text,marginBottom:1}}>{n.title}</div>
                    <div style={{fontSize:10,color:c.textMute}}>{n.desc}</div>
                  </div>
                  {!readIds.includes(n.id)&&<div style={{width:6,height:6,borderRadius:'50%',background:c.blue,flexShrink:0,marginTop:3}}/>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help / FAQ */}
      <div style={{position:'relative'}}>
        <button onClick={()=>{setShowHelp(p=>!p);setShowNotif(false);setShowUser(false)}}
          style={{background:'none',border:'none',cursor:'pointer',color:c.textSub,padding:6,display:'flex'}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3m.08 4h.01"/>
          </svg>
        </button>
        {showHelp&&(
          <div style={{position:'absolute',right:0,top:'100%',marginTop:6,background:c.card,border:`1px solid ${c.border}`,borderRadius:12,width:360,boxShadow:'0 16px 40px rgba(0,0,0,0.5)',zIndex:400,maxHeight:480,overflowY:'auto'}}>
            <div style={{padding:'12px 16px',borderBottom:`1px solid ${c.border}`,fontWeight:700,color:c.text,fontSize:13}}>Help & FAQ</div>
            {FAQ_ITEMS.map((item,i)=>(
              <div key={i} style={{borderBottom:i<FAQ_ITEMS.length-1?`1px solid ${c.border}`:'none'}}>
                <button onClick={()=>setOpenFaq(openFaq===i?null:i)}
                  style={{display:'flex',justifyContent:'space-between',alignItems:'center',width:'100%',padding:'11px 16px',background:'none',border:'none',color:c.text,fontSize:12,fontWeight:600,cursor:'pointer',textAlign:'left',fontFamily:'inherit',gap:8}}>
                  <span>{item.q}</span>
                  <span style={{color:c.cyan,flexShrink:0,fontSize:14,transition:'transform 0.2s',display:'inline-block',transform:openFaq===i?'rotate(180deg)':'none'}}>▾</span>
                </button>
                {openFaq===i&&(
                  <div style={{padding:'0 16px 12px',fontSize:11,color:c.textSub,lineHeight:1.6}}>{item.a}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User */}
      <div style={{position:'relative'}}>
        <button onClick={()=>{setShowUser(p=>!p);setShowNotif(false);setShowHelp(false)}}
          style={{display:'flex',alignItems:'center',gap:7,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
          <div style={{width:30,height:30,borderRadius:8,background:'linear-gradient(135deg,#1d4ed8,#0ea5e9)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'white'}}>OM</div>
          <div style={{textAlign:'left'}}>
            <div style={{fontSize:12,fontWeight:600,color:c.text}}>Ops Manager</div>
            <div style={{fontSize:10,color:c.textMute}}>PORT-SG-01</div>
          </div>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={c.textMute} strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        {showUser&&(
          <div style={{position:'absolute',right:0,top:'100%',marginTop:6,background:c.card,border:`1px solid ${c.border}`,borderRadius:10,minWidth:190,boxShadow:'0 16px 40px rgba(0,0,0,0.5)',zIndex:400}}>
            <div style={{padding:'10px 16px 12px',borderBottom:`1px solid ${c.border}`}}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:c.green}}/><span style={{fontSize:10,color:c.green}}>Online</span>
              </div>
              <div style={{fontWeight:700,color:c.text,fontSize:13}}>Ops Manager</div>
              <div style={{fontSize:10,color:c.textMute}}>PORT-SG-01 · Administrator</div>
            </div>
            {['Profile','Account Settings','Notification Preferences'].map(item=>(
              <button key={item} onClick={()=>setShowUser(false)} style={{display:'block',width:'100%',padding:'9px 16px',background:'none',border:'none',color:c.textSub,fontSize:12,cursor:'pointer',textAlign:'left',fontFamily:'inherit'}}>{item}</button>
            ))}
            <div style={{borderTop:`1px solid ${c.border}`}}>
              <button onClick={()=>setShowUser(false)} style={{display:'block',width:'100%',padding:'9px 16px',background:'none',border:'none',color:c.red,fontSize:12,cursor:'pointer',textAlign:'left',fontFamily:'inherit',fontWeight:700}}>Sign Out</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
//  SIDEBAR
// ════════════════════════════════════════════════════════════════════
const NAV_ITEMS: {id:Nav;label:string;icon:string}[] = [
  {id:'overview',     label:'Overview',        icon:'M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z'},
  {id:'yardmap',      label:'Yard Map',         icon:'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18'},
  {id:'containers',   label:'Containers',       icon:'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'},
  {id:'craneops',     label:'Crane Operations', icon:'M12 2v4M8 6l-4 4M16 6l4 4M4 10h16M4 10v10a1 1 0 001 1h14a1 1 0 001-1V10M9 21v-5h6v5'},
  {id:'optimization', label:'Optimization',     icon:'M13 10V3L4 14h7v7l9-11h-7z'},
  {id:'analytics',    label:'Analytics',        icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'},
  {id:'alerts',       label:'Alerts',           icon:'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'},
  {id:'reports',      label:'Reports',          icon:'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'},
]
function SidebarIcon({d,active}:{d:string;active:boolean}){
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active?c.cyan:c.textSub} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
}
function Sidebar({nav,setNav,onSignOut}:{nav:Nav;setNav:(n:Nav)=>void;onSignOut:()=>void}){
  return (
    <div style={{width:210,minHeight:'100vh',background:c.sidebar,borderRight:`1px solid ${c.border}`,display:'flex',flexDirection:'column',flexShrink:0,fontFamily:"'Inter','Segoe UI',system-ui,sans-serif"}}>
      <div style={{padding:'18px 14px 14px',borderBottom:`1px solid ${c.border}`}}>
        <div style={{display:'flex',alignItems:'center',gap:9}}>
          <div style={{width:32,height:32,borderRadius:7,background:`linear-gradient(135deg,${c.cyan},#0070a0)`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 0 14px rgba(0,217,255,0.3)`}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 17l4-8 4 4 4-6 4 10" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><rect x="1" y="19" width="22" height="2" rx="1" fill="white" opacity="0.5"/></svg>
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:c.text,letterSpacing:2}}>PORTIQ</div>
            <div style={{fontSize:8,color:c.textSub,letterSpacing:2}}>YARD OPTIMIZER</div>
          </div>
        </div>
      </div>
      <div style={{padding:'10px 0',flex:1}}>
        <div style={{fontSize:9,color:c.textMute,letterSpacing:2,padding:'7px 14px 5px',fontWeight:700}}>NAVIGATION</div>
        {NAV_ITEMS.map(item=>{
          const active=nav===item.id
          return (
            <button key={item.id} onClick={()=>setNav(item.id)}
              style={{display:'flex',alignItems:'center',gap:9,width:'100%',padding:'8px 14px',background:active?c.activeBg:'transparent',border:'none',borderLeft:active?`3px solid ${c.cyan}`:'3px solid transparent',color:active?c.cyan:c.textSub,fontSize:12,fontWeight:active?700:400,cursor:'pointer',textAlign:'left',fontFamily:'inherit',transition:'all 0.15s'}}>
              <SidebarIcon d={item.icon} active={active}/>
              {item.label}
              {item.id==='alerts'&&<span style={{marginLeft:'auto',background:c.red,color:'white',borderRadius:10,padding:'1px 6px',fontSize:9,fontWeight:700}}>3</span>}
            </button>
          )
        })}
        <div style={{fontSize:9,color:c.textMute,letterSpacing:2,padding:'14px 14px 5px',fontWeight:700}}>SYSTEM</div>
        {[{id:'settings' as Nav,label:'Settings',icon:'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z'}].map(item=>{
          const active=nav===item.id
          return (
            <button key={item.id} onClick={()=>setNav(item.id)}
              style={{display:'flex',alignItems:'center',gap:9,width:'100%',padding:'8px 14px',background:active?c.activeBg:'transparent',border:'none',borderLeft:active?`3px solid ${c.cyan}`:'3px solid transparent',color:active?c.cyan:c.textSub,fontSize:12,fontWeight:active?700:400,cursor:'pointer',textAlign:'left',fontFamily:'inherit'}}>
              <SidebarIcon d={item.icon} active={active}/>
              {item.label}
            </button>
          )
        })}
      </div>
      <div style={{padding:'10px 14px',borderTop:`1px solid ${c.border}`}}>
        <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:3}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:c.green}}/>
          <span style={{fontSize:10,color:c.green,fontWeight:600}}>System Operational</span>
        </div>
        <div style={{fontSize:9,color:c.textMute}}>v2.4.1 · PORT-SG-01</div>
        <button onClick={onSignOut} style={{marginTop:8,width:'100%',padding:'6px',background:'transparent',border:`1px solid ${c.border}`,borderRadius:5,color:c.red,fontSize:10,cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>Sign Out</button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
//  OVERVIEW PAGE — KPIs + 3D Yard HERO + Inspector
// ════════════════════════════════════════════════════════════════════
function OverviewPage({onNavYard}:{onNavYard:()=>void}){
  const [flow,setFlow]=useState<YardFlow>('idle')
  const [showOpt,setShowOpt]=useState(false)
  const [applied,setApplied]=useState(false)

  const KPIs=[
    {label:'CONTAINERS IN YARD',value:'12,486',color:c.cyan,sub:'−23 from yesterday'},
    {label:'YARD UTILIZATION',  value:'78%',   color:c.orange,sub:'Block A03 critical'},
    {label:'ACTIVE CRANES',     value:'8 / 10',color:c.green,sub:'2 in maintenance'},
    {label:'PENDING RETRIEVALS',value:'47',    color:c.yellow,sub:'3 high priority'},
    {label:'AVG RETRIEVAL',     value:'8m 42s',color:c.textSub,sub:'current average'},
    {label:'OPTIMIZATION SCORE',value:'94%',   color:c.green,sub:'+2.1% this week'},
  ]

  function handleSelectTarget(){
    if(flow==='idle') setFlow('selected')
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden',fontFamily:"'Inter','Segoe UI',system-ui,sans-serif"}}>
      {/* KPI strip */}
      <div style={{display:'flex',gap:10,padding:'12px 16px',borderBottom:`1px solid ${c.border}`,flexShrink:0}}>
        {KPIs.map(kpi=>(
          <div key={kpi.label} style={{flex:1,background:c.card,border:`1px solid ${c.border}`,borderRadius:10,padding:'10px 14px',cursor:'default',transition:'border-color 0.2s'}}>
            <div style={{fontSize:8,color:c.textMute,letterSpacing:1.5,fontWeight:700,marginBottom:6}}>{kpi.label}</div>
            <div style={{fontSize:22,fontWeight:800,color:kpi.color,fontFamily:'monospace',lineHeight:1}}>{kpi.value}</div>
            <div style={{fontSize:9,color:c.textMute,marginTop:4}}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Yard + Inspector */}
      <div style={{flex:1,display:'flex',overflow:'hidden'}}>
        {/* Yard area */}
        <div style={{flex:1,display:'flex',flexDirection:'column',padding:16,overflow:'hidden'}}>
          {/* Controls bar */}
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12,flexShrink:0}}>
            <div style={{display:'flex',gap:6}}>
              {[{v:'3D',active:true},{v:'2D',active:false}].map(btn=>(
                <button key={btn.v} style={{padding:'5px 14px',background:btn.active?c.cyan:'transparent',border:`1px solid ${btn.active?c.cyan:c.border}`,borderRadius:6,color:btn.active?'#000':c.textSub,fontSize:11,fontWeight:btn.active?700:400,cursor:'pointer',fontFamily:'inherit'}}>{btn.v}</button>
              ))}
            </div>
            <div style={{display:'flex',gap:10,marginLeft:6}}>
              {[{color:'#1e4280',l:'Normal'},{color:'#1a5c35',l:'Optimized'},{color:'#7a3a10',l:'Attention'},{color:'#7a1a1a',l:'Blocked'},{color:'#5a1a8a',l:'Selected'}].map(lg=>(
                <div key={lg.l} style={{display:'flex',alignItems:'center',gap:5}}>
                  <div style={{width:9,height:9,background:lg.color,borderRadius:2}}/>
                  <span style={{fontSize:10,color:c.textMute}}>{lg.l}</span>
                </div>
              ))}
            </div>
            <div style={{marginLeft:'auto',fontSize:11,color:c.textMute}}>
              Click <span style={{color:'#c084fc',fontWeight:700}}>CNU-48291</span> in Block B03 to begin
            </div>
          </div>

          {/* 3D Yard */}
          <div style={{flex:1,background:c.card,border:`1px solid ${c.border}`,borderRadius:12,overflow:'hidden',position:'relative',minHeight:0}}>
            <IsometricYard flow={flow} onSelectTarget={handleSelectTarget} applied={applied}/>
            {/* Flow status strip */}
            {flow!=='idle'&&(
              <div style={{position:'absolute',bottom:12,left:'50%',transform:'translateX(-50%)',display:'flex',gap:0,background:c.cardHi,border:`1px solid ${c.border}`,borderRadius:20,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,0.4)'}}>
                {['selected','blocking','optimized','routing','applied'].map((step,i)=>{
                  const steps=['selected','blocking','optimized','routing','applied']
                  const done=steps.indexOf(flow)>=i
                  return (
                    <div key={step} style={{padding:'5px 14px',fontSize:9,fontWeight:700,letterSpacing:1,color:done?c.cyan:c.textMute,background:done?'rgba(0,217,255,0.06)':'transparent',borderRight:i<4?`1px solid ${c.border}`:'none'}}>
                      {done?'✓ ':''}{step.toUpperCase()}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Inspector */}
        {flow!=='idle'&&(
          <ContainerInspector flow={flow} setFlow={setFlow} applied={applied} setApplied={setApplied}
            onOptimize={()=>setShowOpt(true)}/>
        )}
      </div>

      {showOpt&&<OptModal flow={flow} setFlow={setFlow} setApplied={setApplied} onClose={()=>{setShowOpt(false);setFlow('optimized')}}/>}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
//  YARD MAP PAGE
// ════════════════════════════════════════════════════════════════════
function YardMapPage({searchQuery}:{searchQuery:string}){
  const [flow,setFlow]=useState<YardFlow>('idle')
  const [showOpt,setShowOpt]=useState(false)
  const [applied,setApplied]=useState(false)
  const [query,setQuery]=useState(searchQuery)

  useEffect(()=>{
    if(searchQuery){ setQuery(searchQuery); setFlow('selected') }
  },[searchQuery])

  return (
    <div style={{display:'flex',height:'100%',overflow:'hidden',fontFamily:"'Inter','Segoe UI',system-ui,sans-serif"}}>
      <div style={{flex:1,display:'flex',flexDirection:'column',padding:16,overflow:'hidden'}}>
        {/* Search + controls */}
        <div style={{display:'flex',gap:10,marginBottom:12,flexShrink:0,alignItems:'center'}}>
          <div style={{position:'relative',flex:1,maxWidth:340}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c.textMute} strokeWidth="2" style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)'}}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input value={query} onChange={e=>setQuery(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&query.toUpperCase().includes('CNU')) setFlow('selected')}}
              placeholder="Search container ID (try CNU-48291)…"
              style={{width:'100%',padding:'8px 10px 8px 28px',background:c.inputBg,border:`1px solid ${c.border}`,borderRadius:7,color:c.text,fontSize:12,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}}/>
          </div>
          <button onClick={()=>{if(query.toUpperCase().includes('CNU')) setFlow('selected')}}
            style={{padding:'8px 18px',background:c.cyan,border:'none',borderRadius:7,color:'#000',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
            SEARCH
          </button>
          {['3D','2D','Filters'].map(l=>(
            <button key={l} style={{padding:'7px 12px',background:l==='3D'?c.cyan:'transparent',border:`1px solid ${l==='3D'?c.cyan:c.border}`,borderRadius:7,color:l==='3D'?'#000':c.textSub,fontSize:11,cursor:'pointer',fontFamily:'inherit',fontWeight:l==='3D'?700:400}}>{l}</button>
          ))}
          {flow!=='idle'&&<button onClick={()=>{setFlow('idle');setApplied(false)}} style={{padding:'7px 12px',background:'transparent',border:`1px solid ${c.border}`,borderRadius:7,color:c.textSub,fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>Clear</button>}
        </div>
        <div style={{flex:1,background:c.card,border:`1px solid ${c.border}`,borderRadius:12,overflow:'hidden',minHeight:0,position:'relative'}}>
          <IsometricYard flow={flow} onSelectTarget={()=>{ if(flow==='idle') setFlow('selected') }} applied={applied}/>
        </div>
      </div>
      {flow!=='idle'&&(
        <ContainerInspector flow={flow} setFlow={setFlow} applied={applied} setApplied={setApplied}
          onOptimize={()=>setShowOpt(true)}/>
      )}
      {showOpt&&<OptModal flow={flow} setFlow={setFlow} setApplied={setApplied} onClose={()=>{setShowOpt(false);setFlow('optimized')}}/>}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
//  INTERACTIVE ANALYTICS CHARTS
// ════════════════════════════════════════════════════════════════════
type Tooltip = { x:number; y:number; content:string } | null

function InteractiveLineChart(){
  const [tooltip,setTooltip]=useState<Tooltip>(null)
  const svgRef=useRef<SVGSVGElement>(null)
  const W=560,H=130
  const labels=['00:00','02:00','04:00','06:00','08:00','10:00','12:00','14:00','16:00','18:00','20:00','22:00']
  const plan=    [8.5,9.2,11.4,9.8,8.1,7.5,8.8,9.1,8.4,8.7,9.0,8.8]
  const optimized=[7.1,7.8,9.2,8.0,6.5,6.1,7.0,7.2,6.8,7.0,7.2,7.0]
  const max=13,min=4
  const toY=(v:number)=>H-((v-min)/(max-min))*H
  const toX=(i:number)=>(i/(plan.length-1))*W
  const planPath=plan.map((v,i)=>`${i===0?'M':'L'}${toX(i)},${toY(v)}`).join(' ')
  const optPath=optimized.map((v,i)=>`${i===0?'M':'L'}${toX(i)},${toY(v)}`).join(' ')
  const fillPath=optimized.map((v,i)=>`${i===0?'M':'L'}${toX(i)},${toY(v)}`).join(' ')+` L${W},${H} L0,${H} Z`

  function handleMouseMove(e:React.MouseEvent<SVGSVGElement>){
    const rect=svgRef.current?.getBoundingClientRect()
    if(!rect) return
    const relX=(e.clientX-rect.left)*(W/rect.width)
    const idx=Math.round((relX/W)*(plan.length-1))
    const safeIdx=Math.max(0,Math.min(plan.length-1,idx))
    setTooltip({x:e.clientX-rect.left,y:e.clientY-rect.top,content:`${labels[safeIdx]}\nAvg: ${plan[safeIdx]}m\nOpt: ${optimized[safeIdx]}m`})
  }

  return (
    <div style={{position:'relative'}}>
      <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H+28}`} style={{display:'block',cursor:'crosshair'}}
        onMouseMove={handleMouseMove} onMouseLeave={()=>setTooltip(null)}>
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.cyan} stopOpacity="0.18"/>
            <stop offset="100%" stopColor={c.cyan} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[4,6,8,10,12].map(v=><line key={v} x1="0" y1={toY(v)} x2={W} y2={toY(v)} stroke={c.border} strokeWidth="1"/>)}
        {[4,6,8,10,12].map(v=><text key={`l${v}`} x="-4" y={toY(v)+4} textAnchor="end" fill={c.textMute} fontSize="8" fontFamily="monospace">{v}m</text>)}
        <path d={fillPath} fill="url(#lg)"/>
        <path d={planPath} fill="none" stroke={c.borderHi} strokeWidth="2" strokeDasharray="4 3"/>
        <path d={optPath}  fill="none" stroke={c.cyan} strokeWidth="2.5"/>
        {optimized.map((v,i)=><circle key={i} cx={toX(i)} cy={toY(v)} r="3" fill={c.cyan} opacity="0.8"/>)}
        {labels.map((l,i)=><text key={l} x={toX(i)} y={H+20} textAnchor="middle" fill={c.textMute} fontSize="9" fontFamily="monospace">{l}</text>)}
      </svg>
      {tooltip&&(
        <div style={{position:'absolute',left:tooltip.x+10,top:Math.max(0,tooltip.y-60),background:c.cardHi,border:`1px solid ${c.borderHi}`,borderRadius:6,padding:'7px 10px',pointerEvents:'none',zIndex:10,minWidth:130}}>
          {tooltip.content.split('\n').map((line,i)=>(
            <div key={i} style={{fontSize:11,color:i===0?c.text:i===1?c.textSub:c.cyan,fontFamily:'monospace',fontWeight:i===0?700:400}}>{line}</div>
          ))}
        </div>
      )}
      <div style={{display:'flex',gap:18,marginTop:8}}>
        <div style={{display:'flex',alignItems:'center',gap:5}}>
          <div style={{width:18,height:2,background:c.borderHi,borderRadius:1}}/>
          <span style={{fontSize:11,color:c.textSub}}>Average Plan</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:5}}>
          <div style={{width:18,height:2,background:c.cyan,borderRadius:1}}/>
          <span style={{fontSize:11,color:c.textSub}}>Optimized</span>
        </div>
      </div>
    </div>
  )
}

function InteractiveDonut(){
  const [hovered,setHovered]=useState<number|null>(null)
  const segments=[
    {label:'Time Saved',   pct:34,color:c.cyan},
    {label:'Fuel Saved',   pct:22,color:c.green},
    {label:'Moves Reduced',pct:28,color:c.purple},
    {label:'Labor Saved',  pct:16,color:c.orange},
  ]
  const r=50,cx=65,cy=65,stroke=16,circ=2*Math.PI*r
  let cumulative=0
  return (
    <div style={{display:'flex',gap:16,alignItems:'center'}}>
      <svg width="130" height="130">
        {segments.map((seg,i)=>{
          const dash=(seg.pct/100)*circ
          const gap=circ-dash
          const rotate=(cumulative/100)*360-90
          cumulative+=seg.pct
          const isHov=hovered===i
          return (
            <circle key={seg.label} cx={cx} cy={cy} r={isHov?r+3:r}
              fill="none" stroke={seg.color} strokeWidth={isHov?stroke+3:stroke}
              strokeDasharray={`${dash} ${gap}`}
              transform={`rotate(${rotate} ${cx} ${cy})`}
              style={{transition:'r 0.15s,stroke-width 0.15s',cursor:'pointer',opacity:hovered===null||isHov?1:0.55}}
              onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)}/>
          )
        })}
        {hovered!==null&&(
          <text x={cx} y={cy+5} textAnchor="middle" fill={segments[hovered].color} fontSize="14" fontWeight="800">{segments[hovered].pct}%</text>
        )}
      </svg>
      <div style={{display:'flex',flexDirection:'column',gap:9,flex:1}}>
        {segments.map((seg,i)=>(
          <div key={seg.label} onClick={()=>setHovered(hovered===i?null:i)}
            style={{display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',opacity:hovered===null||hovered===i?1:0.5,transition:'opacity 0.15s'}}>
            <div style={{display:'flex',alignItems:'center',gap:7}}>
              <div style={{width:9,height:9,borderRadius:2,background:seg.color}}/>
              <span style={{fontSize:11,color:c.textSub}}>{seg.label}</span>
            </div>
            <span style={{fontSize:12,fontWeight:700,color:seg.color}}>{seg.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function InteractiveBars({data,max,color,labelFn}:{data:{label:string;value:number}[];max:number;color:string;labelFn:(v:number)=>string}){
  const [hov,setHov]=useState<number|null>(null)
  return (
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {data.map((d,i)=>(
        <div key={d.label} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}
          style={{position:'relative',cursor:'default'}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:3,fontFamily:'monospace'}}>
            <span style={{color:c.textMute}}>{d.label}</span>
            <span style={{color:hov===i?color:c.textSub,fontWeight:700}}>{labelFn(d.value)}</span>
          </div>
          <div style={{height:9,background:c.border,borderRadius:4,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${(d.value/max)*100}%`,background:hov===i?color:shadeHex(color,0.7),borderRadius:4,transition:'width 0.8s,background 0.15s'}}/>
          </div>
        </div>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
//  ANALYTICS PAGE
// ════════════════════════════════════════════════════════════════════
function AnalyticsPage(){
  const blocks=[
    {label:'BLOCK A01',value:82,color:c.orange},
    {label:'BLOCK A02',value:71,color:c.green},
    {label:'BLOCK A03',value:95,color:c.red},
    {label:'BLOCK B01',value:58,color:c.green},
    {label:'BLOCK B02',value:44,color:c.cyan},
    {label:'BLOCK B03',value:67,color:c.cyan},
    {label:'BLOCK C01',value:38,color:c.green},
  ]
  const cranes=[
    {label:'CRANE-01',value:78},
    {label:'CRANE-02',value:45},
    {label:'CRANE-03',value:32},
    {label:'CRANE-04',value:61},
  ]
  const [hovBlock,setHovBlock]=useState<number|null>(null)

  return (
    <div style={{padding:16,display:'flex',flexDirection:'column',gap:14,fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",overflowY:'auto',height:'100%'}}>
      {/* KPIs */}
      <div style={{display:'flex',gap:12}}>
        {[{label:'AVERAGE RETRIEVAL',value:'8m 42s',color:c.textSub},{label:'OPTIMIZED AVERAGE',value:'6m 31s',color:c.cyan},{label:'DAILY THROUGHPUT',value:'1,284',color:c.text},{label:'EFFICIENCY SCORE',value:'89.2%',color:c.green}].map(k=>(
          <div key={k.label} style={{flex:1,background:c.card,border:`1px solid ${c.border}`,borderRadius:10,padding:'14px 16px'}}>
            <div style={{fontSize:8,color:c.textMute,letterSpacing:1.5,marginBottom:8}}>{k.label}</div>
            <div style={{fontSize:26,fontWeight:800,color:k.color,fontFamily:'monospace'}}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:14}}>
        <div style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:12,padding:'16px 18px'}}>
          <div style={{fontWeight:700,color:c.text,marginBottom:2}}>Retrieval Time Trend</div>
          <div style={{fontSize:11,color:c.textMute,marginBottom:12}}>Minutes per retrieval — 24h · Hover for values</div>
          <InteractiveLineChart/>
        </div>
        <div style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:12,padding:'16px 18px'}}>
          <div style={{fontWeight:700,color:c.text,marginBottom:2}}>Optimization Breakdown</div>
          <div style={{fontSize:11,color:c.textMute,marginBottom:12}}>By category · Click to highlight</div>
          <InteractiveDonut/>
        </div>
      </div>

      {/* Charts row 2 */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
        <div style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:12,padding:'16px 18px'}}>
          <div style={{fontWeight:700,color:c.text,marginBottom:2}}>Crane Utilization</div>
          <div style={{fontSize:11,color:c.textMute,marginBottom:14}}>% active time per crane</div>
          <InteractiveBars data={cranes} max={100} color={c.cyan} labelFn={v=>`${v}%`}/>
        </div>
        <div style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:12,padding:'16px 18px'}}>
          <div style={{fontWeight:700,color:c.text,marginBottom:2}}>Container Throughput</div>
          <div style={{fontSize:11,color:c.textMute,marginBottom:14}}>Daily operations this week</div>
          <ThroughputChart/>
        </div>
        <div style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:12,padding:'16px 18px'}}>
          <div style={{fontWeight:700,color:c.text,marginBottom:2}}>Yard Utilization</div>
          <div style={{fontSize:11,color:c.textMute,marginBottom:14}}>Capacity by block · Hover for details</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {blocks.map((blk,i)=>(
              <div key={blk.label} onMouseEnter={()=>setHovBlock(i)} onMouseLeave={()=>setHovBlock(null)}
                style={{cursor:'default',position:'relative'}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:9,marginBottom:3,fontFamily:'monospace'}}>
                  <span style={{color:c.textMute}}>{blk.label}</span>
                  <span style={{color:blk.color,fontWeight:700}}>{blk.value}%</span>
                </div>
                <div style={{height:5,background:c.border,borderRadius:3}}>
                  <div style={{height:'100%',width:`${blk.value}%`,background:blk.color,borderRadius:3,transition:'width 0.8s'}}/>
                </div>
                {hovBlock===i&&(
                  <div style={{position:'absolute',right:0,top:-36,background:c.cardHi,border:`1px solid ${c.borderHi}`,borderRadius:6,padding:'5px 10px',zIndex:10,whiteSpace:'nowrap',pointerEvents:'none'}}>
                    <div style={{fontSize:10,fontWeight:700,color:c.text}}>{blk.label}</div>
                    <div style={{fontSize:9,color:c.textMute}}>Capacity: {Math.round(blk.value*1.2*100/100)} / {Math.round(100)}% · {blk.value}% used</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ThroughputChart(){
  const [hov,setHov]=useState<number|null>(null)
  const data=[920,1040,1180,1060,1320,1240,1410,1290,1380,1450,1284,0]
  const days=['M','T','W','T','F','S','S','M','T','W','T','F']
  const max=1600
  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-end',gap:4,height:100,marginBottom:4}}>
        {data.map((v,i)=>(
          <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:0,position:'relative'}}
            onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}>
            {hov===i&&v>0&&(
              <div style={{position:'absolute',bottom:'100%',marginBottom:3,background:c.cardHi,border:`1px solid ${c.borderHi}`,borderRadius:4,padding:'3px 7px',whiteSpace:'nowrap',zIndex:10,pointerEvents:'none'}}>
                <span style={{fontSize:10,color:c.text,fontFamily:'monospace'}}>{v.toLocaleString()}</span>
              </div>
            )}
            <div style={{width:'100%',background:hov===i?c.cyan:i===10?shadeHex(c.cyan,0.7):'#1e3a52',borderRadius:'3px 3px 0 0',height:`${(v/max)*96}px`,minHeight:v?3:0,transition:'background 0.15s'}}/>
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:4}}>
        {days.map((d,i)=><span key={i} style={{flex:1,textAlign:'center',fontSize:9,color:c.textMute}}>{d}</span>)}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
//  CONTAINERS PAGE
// ════════════════════════════════════════════════════════════════════
function ContainersPage(){
  const [filter,setFilter]=useState('All')
  const rows=[
    {id:'CNU-48291',status:'Active',   block:'B03',bay:'17',row:'04',lev:'05',dest:'Singapore', weight:'18.4t',priority:'High',  crane:'CRANE-04',eta:'6m 24s', statusColor:c.cyan},
    {id:'CNU-48275',status:'Blocking', block:'B03',bay:'17',row:'04',lev:'06',dest:'Rotterdam',  weight:'14.2t',priority:'High',  crane:'CRANE-04',eta:'2m 10s', statusColor:c.red},
    {id:'CNU-48281',status:'Blocking', block:'B03',bay:'17',row:'04',lev:'05',dest:'Hamburg',    weight:'16.8t',priority:'High',  crane:'CRANE-04',eta:'2m 45s', statusColor:c.red},
    {id:'HLC-55213',status:'Active',   block:'B03',bay:'17',row:'05',lev:'03',dest:'Dubai',       weight:'22.1t',priority:'Med',   crane:'CRANE-01',eta:'12m 00s',statusColor:c.green},
    {id:'MSC-33741',status:'Active',   block:'A01',bay:'04',row:'02',lev:'03',dest:'New York',    weight:'19.5t',priority:'Low',   crane:'CRANE-02',eta:'18m 30s',statusColor:c.green},
    {id:'EVR-67892',status:'Transit',  block:'B03',bay:'17',row:'06',lev:'02',dest:'Sydney',      weight:'26.7t',priority:'Low',   crane:'CRANE-03',eta:'24m 00s',statusColor:c.orange},
    {id:'BTU-20043',status:'Active',   block:'B03',bay:'17',row:'03',lev:'03',dest:'Tokyo',       weight:'14.3t',priority:'Med',   crane:'CRANE-02',eta:'15m 15s',statusColor:c.green},
    {id:'BCU-10012',status:'Active',   block:'A02',bay:'09',row:'02',lev:'02',dest:'Los Angeles', weight:'12.8t',priority:'Low',   crane:'CRANE-03',eta:'20m 45s',statusColor:c.green},
  ]
  const filtered=filter==='All'?rows:rows.filter(r=>r.status===filter)
  return (
    <div style={{padding:16,fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",overflowY:'auto',height:'100%'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div>
          <h2 style={{margin:0,color:c.text,fontSize:17}}>Container Management</h2>
          <p style={{margin:'3px 0 0',color:c.textMute,fontSize:11}}>{filtered.length} containers · PORT-SG-01</p>
        </div>
        <div style={{display:'flex',gap:6}}>
          {['All','Active','Blocking','Transit'].map(f=>(
            <button key={f} onClick={()=>setFilter(f)}
              style={{padding:'6px 12px',background:f===filter?c.cyan:'transparent',border:`1px solid ${f===filter?c.cyan:c.border}`,borderRadius:6,color:f===filter?'#000':c.textSub,fontSize:11,cursor:'pointer',fontFamily:'inherit',fontWeight:f===filter?700:400}}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <div style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:12,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr style={{borderBottom:`1px solid ${c.border}`}}>
              {['Container ID','Status','Block','Bay/Row/Lev','Destination','Weight','Priority','Crane','ETA'].map(h=>(
                <th key={h} style={{padding:'10px 13px',textAlign:'left',fontSize:9,color:c.textMute,letterSpacing:1,fontWeight:700}}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row,i)=>(
              <tr key={row.id} style={{borderBottom:i<filtered.length-1?`1px solid ${c.border}`:'none'}}>
                <td style={{padding:'10px 13px',fontFamily:'monospace',fontWeight:700,color:row.statusColor,fontSize:12}}>{row.id}</td>
                <td style={{padding:'10px 13px'}}>
                  <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:8,background:`${row.statusColor}18`,color:row.statusColor}}>{row.status}</span>
                </td>
                <td style={{padding:'10px 13px',color:c.textSub,fontSize:11,fontFamily:'monospace'}}>{row.block}</td>
                <td style={{padding:'10px 13px',color:c.textSub,fontSize:11,fontFamily:'monospace'}}>{row.bay}/{row.row}/{row.lev}</td>
                <td style={{padding:'10px 13px',color:c.textSub,fontSize:11}}>{row.dest}</td>
                <td style={{padding:'10px 13px',color:c.textSub,fontSize:11,fontFamily:'monospace'}}>{row.weight}</td>
                <td style={{padding:'10px 13px'}}>
                  <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:8,background:row.priority==='High'?'rgba(239,68,68,0.1)':row.priority==='Med'?'rgba(234,179,8,0.1)':'rgba(100,116,139,0.1)',color:row.priority==='High'?c.red:row.priority==='Med'?c.yellow:c.textSub}}>{row.priority}</span>
                </td>
                <td style={{padding:'10px 13px',color:c.textSub,fontSize:11,fontFamily:'monospace'}}>{row.crane}</td>
                <td style={{padding:'10px 13px',color:c.cyan,fontSize:11,fontFamily:'monospace',fontWeight:700}}>{row.eta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
//  CRANE OPERATIONS PAGE
// ════════════════════════════════════════════════════════════════════
function CraneOpsPage(){
  const [selected,setSelected]=useState<string|null>(null)
  const cranes=[
    {id:'CRANE-01',status:'Operating',task:'Loading — Bay 12, Block A01',util:78,color:c.green,location:'A01 Bay 12',queue:3},
    {id:'CRANE-02',status:'Idle',     task:'Standby — awaiting dispatch', util:0, color:c.textMute,location:'A02 Bay 07',queue:0},
    {id:'CRANE-03',status:'Operating',task:'Repositioning — Bay 7, Block A02',util:44,color:c.green,location:'A02 Bay 07',queue:2},
    {id:'CRANE-04',status:'Assigned', task:'CNU-48291 retrieval — B03 Bay 17',util:61,color:c.cyan,location:'B03 Bay 17',queue:1},
    {id:'CRANE-05',status:'Maintenance',task:'Scheduled maintenance — bay offline',util:0,color:c.orange,location:'Maintenance bay',queue:0},
  ]
  return (
    <div style={{padding:16,fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",overflowY:'auto',height:'100%'}}>
      <h2 style={{margin:'0 0 4px',color:c.text}}>Crane Operations</h2>
      <p style={{margin:'0 0 16px',color:c.textMute,fontSize:11}}>Real-time RTG status · PORT-SG-01</p>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {cranes.map(cr=>(
          <div key={cr.id} onClick={()=>setSelected(selected===cr.id?null:cr.id)}
            style={{background:c.card,border:`1px solid ${selected===cr.id?cr.color:c.border}`,borderRadius:12,padding:'16px 20px',cursor:'pointer',transition:'border-color 0.2s',boxShadow:selected===cr.id?`0 0 20px ${cr.color}20`:undefined}}>
            <div style={{display:'flex',alignItems:'center',gap:16}}>
              <div style={{width:9,height:9,borderRadius:'50%',background:cr.color,flexShrink:0,boxShadow:cr.status==='Operating'||cr.status==='Assigned'?`0 0 8px ${cr.color}`:'none'}}/>
              <div style={{minWidth:100}}>
                <div style={{fontFamily:'monospace',fontWeight:800,color:c.text,fontSize:14}}>{cr.id}</div>
                <div style={{fontSize:9,color:cr.color,fontWeight:700,letterSpacing:1}}>{cr.status.toUpperCase()}</div>
              </div>
              <div style={{flex:1,fontSize:12,color:c.textSub}}>{cr.task}</div>
              <div style={{fontSize:11,color:c.textMute,fontFamily:'monospace',minWidth:80,textAlign:'right'}}>{cr.location}</div>
              <div style={{width:130}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:c.textMute,marginBottom:3}}>
                  <span>Utilization</span><span style={{color:cr.color,fontWeight:700}}>{cr.util}%</span>
                </div>
                <div style={{height:5,background:c.border,borderRadius:3}}>
                  <div style={{height:'100%',width:`${cr.util}%`,background:cr.color,borderRadius:3}}/>
                </div>
              </div>
            </div>
            {selected===cr.id&&(
              <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${c.border}`,display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
                {[{l:'Queue',v:`${cr.queue} jobs`},{l:'Avg Move Time',v:'1m 24s'},{l:'Today\'s Moves',v:`${Math.floor(cr.util*1.5)}`},{l:'Fuel Used',v:`${Math.floor(cr.util*0.8)}L`}].map(s=>(
                  <div key={s.l} style={{background:c.cardHi,borderRadius:8,padding:'10px 12px',textAlign:'center'}}>
                    <div style={{fontSize:9,color:c.textMute,marginBottom:4}}>{s.l}</div>
                    <div style={{fontSize:14,fontWeight:800,color:c.text,fontFamily:'monospace'}}>{s.v}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
//  OPTIMIZATION PAGE
// ════════════════════════════════════════════════════════════════════
function OptimizationPage(){
  const tasks=[
    {id:'OPT-2847',container:'CNU-48291',saving:'2m 18s',status:'Active',  priority:'High',crane:'CRANE-04',color:c.cyan},
    {id:'OPT-2846',container:'MSC-71203',saving:'1m 44s',status:'Queued',  priority:'Med', crane:'CRANE-01',color:c.yellow},
    {id:'OPT-2845',container:'EVR-55019',saving:'3m 12s',status:'Completed',priority:'High',crane:'CRANE-03',color:c.green},
    {id:'OPT-2844',container:'HLC-28801',saving:'0m 58s',status:'Completed',priority:'Low', crane:'CRANE-02',color:c.green},
  ]
  return (
    <div style={{padding:16,fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",overflowY:'auto',height:'100%'}}>
      <div style={{display:'flex',gap:12,marginBottom:16}}>
        {[{l:'ACTIVE',v:'1',col:c.cyan},{l:'AVG SAVED',v:'2m 03s',col:c.green},{l:'TODAY SAVED',v:'48m 22s',col:c.purple},{l:'EFFICIENCY',v:'+23.4%',col:c.orange}].map(k=>(
          <div key={k.l} style={{flex:1,background:c.card,border:`1px solid ${c.border}`,borderRadius:10,padding:'14px 16px'}}>
            <div style={{fontSize:8,color:c.textMute,letterSpacing:1.5,marginBottom:8}}>{k.l}</div>
            <div style={{fontSize:26,fontWeight:800,color:k.col,fontFamily:'monospace'}}>{k.v}</div>
          </div>
        ))}
      </div>
      <div style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:12,overflow:'hidden'}}>
        <div style={{padding:'14px 18px',borderBottom:`1px solid ${c.border}`,fontWeight:700,color:c.text}}>Optimization Queue</div>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{borderBottom:`1px solid ${c.border}`}}>
            {['Task ID','Container','Crane','Priority','Time Saved','Status'].map(h=>(
              <th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:9,color:c.textMute,letterSpacing:1}}>{h.toUpperCase()}</th>
            ))}
          </tr></thead>
          <tbody>
            {tasks.map((t,i)=>(
              <tr key={t.id} style={{borderBottom:i<tasks.length-1?`1px solid ${c.border}`:'none'}}>
                <td style={{padding:'11px 14px',fontFamily:'monospace',fontSize:11,color:c.textSub}}>{t.id}</td>
                <td style={{padding:'11px 14px',fontFamily:'monospace',fontWeight:700,color:t.color,fontSize:12}}>{t.container}</td>
                <td style={{padding:'11px 14px',fontFamily:'monospace',fontSize:11,color:c.textSub}}>{t.crane}</td>
                <td style={{padding:'11px 14px'}}>
                  <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:8,background:t.priority==='High'?'rgba(239,68,68,0.12)':'rgba(234,179,8,0.12)',color:t.priority==='High'?c.red:c.yellow}}>{t.priority}</span>
                </td>
                <td style={{padding:'11px 14px',fontFamily:'monospace',fontSize:12,color:c.green,fontWeight:700}}>{t.saving}</td>
                <td style={{padding:'11px 14px'}}>
                  <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:8,background:t.status==='Active'?'rgba(0,217,255,0.1)':t.status==='Completed'?'rgba(34,197,94,0.1)':'rgba(234,179,8,0.1)',color:t.status==='Active'?c.cyan:t.status==='Completed'?c.green:c.yellow}}>{t.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
//  ALERTS PAGE
// ════════════════════════════════════════════════════════════════════
function AlertsPage(){
  const [activeTab,setActiveTab]=useState('All')
  const alerts=[
    {id:'ALT-0391',level:'CRITICAL',title:'CNU-48291 retrieval blocked',   desc:'3 blocking containers in Block B03. CRANE-04 dispatched for optimization.',time:'2 min ago', color:c.red,    resolved:false},
    {id:'ALT-0390',level:'WARNING', title:'CRANE-05 maintenance window',   desc:'Crane 05 enters scheduled maintenance in 45 minutes. Workload transferred.',time:'18 min ago',color:c.orange, resolved:false},
    {id:'ALT-0389',level:'WARNING', title:'Block A03 capacity at 95%',     desc:'Block A03 approaching full capacity. Consider redistribution to B01/B02.',time:'1 hr ago',  color:c.yellow, resolved:false},
    {id:'ALT-0388',level:'INFO',    title:'Optimization completed — B03',  desc:'Container throughput improved by 12% in Block B03 after optimization.',time:'2 hr ago',  color:c.cyan,   resolved:true},
    {id:'ALT-0387',level:'SUCCESS', title:'Retrieval route optimized',     desc:'CNU-48291 retrieval path confirmed. Estimated time: 6m 24s.',time:'2 hr ago',   color:c.green,  resolved:true},
  ]
  const tabs=['All','Critical','Warning','Info','Resolved']
  const filtered=alerts.filter(a=>activeTab==='All'||(activeTab==='Resolved'?a.resolved:a.level===activeTab.toUpperCase()&&!a.resolved))
  return (
    <div style={{padding:16,fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",overflowY:'auto',height:'100%'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div>
          <h2 style={{margin:0,color:c.text}}>Alerts</h2>
          <p style={{margin:'3px 0 0',color:c.textMute,fontSize:11}}>3 active alerts · PORT-SG-01</p>
        </div>
        <div style={{display:'flex',gap:6}}>
          {tabs.map(t=>(
            <button key={t} onClick={()=>setActiveTab(t)}
              style={{padding:'5px 12px',background:t===activeTab?c.cyan:'transparent',border:`1px solid ${t===activeTab?c.cyan:c.border}`,borderRadius:6,color:t===activeTab?'#000':c.textSub,fontSize:11,cursor:'pointer',fontFamily:'inherit',fontWeight:t===activeTab?700:400}}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {filtered.map(alert=>(
          <div key={alert.id} style={{background:c.card,border:`1px solid ${c.border}`,borderLeft:`4px solid ${alert.color}`,borderRadius:12,padding:'16px 20px',display:'flex',gap:14,opacity:alert.resolved?0.6:1}}>
            <div style={{width:9,height:9,borderRadius:'50%',background:alert.color,marginTop:3,flexShrink:0,boxShadow:`0 0 8px ${alert.color}`}}/>
            <div style={{flex:1}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span style={{fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:8,background:`${alert.color}20`,color:alert.color,letterSpacing:0.5}}>{alert.level}</span>
                  <span style={{fontWeight:700,color:c.text,fontSize:13}}>{alert.title}</span>
                </div>
                <span style={{fontSize:10,color:c.textMute,flexShrink:0}}>{alert.time}</span>
              </div>
              <p style={{margin:0,fontSize:12,color:c.textSub}}>{alert.desc}</p>
              <div style={{fontSize:9,color:c.textMute,fontFamily:'monospace',marginTop:5}}>{alert.id}</div>
            </div>
            <button style={{padding:'5px 12px',background:'transparent',border:`1px solid ${c.border}`,borderRadius:6,color:c.textSub,fontSize:10,cursor:'pointer',fontFamily:'inherit',alignSelf:'flex-start'}}>
              {alert.resolved?'View':'Dismiss'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
//  REPORTS PAGE
// ════════════════════════════════════════════════════════════════════
function ReportsPage(){
  const reports=[
    {name:'Daily Operations Summary',     date:'Aug 16, 2026',type:'PDF', size:'2.4 MB',status:'Ready'},
    {name:'Container Throughput Report',  date:'Aug 15, 2026',type:'XLSX',size:'3.8 MB',status:'Ready'},
    {name:'Crane Performance Report',     date:'Aug 14, 2026',type:'PDF', size:'1.9 MB',status:'Ready'},
    {name:'Yard Utilization Report',      date:'Aug 10, 2026',type:'PDF', size:'4.1 MB',status:'Ready'},
    {name:'Optimization Savings Report',  date:'Aug 09, 2026',type:'CSV', size:'0.9 MB',status:'Ready'},
    {name:'Monthly Operations Summary',   date:'Aug 01, 2026',type:'PDF', size:'6.2 MB',status:'Ready'},
  ]
  return (
    <div style={{padding:16,fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",overflowY:'auto',height:'100%'}}>
      <h2 style={{margin:'0 0 16px',color:c.text}}>Reports</h2>
      <div style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:12,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{borderBottom:`1px solid ${c.border}`}}>
            {['Report Name','Generated','Type','Size','Status',''].map(h=>(
              <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:9,color:c.textMute,letterSpacing:1,fontWeight:700}}>{h.toUpperCase()}</th>
            ))}
          </tr></thead>
          <tbody>
            {reports.map((r,i)=>(
              <tr key={r.name} style={{borderBottom:i<reports.length-1?`1px solid ${c.border}`:'none'}}>
                <td style={{padding:'12px 14px',color:c.text,fontSize:12,fontWeight:600}}>{r.name}</td>
                <td style={{padding:'12px 14px',color:c.textSub,fontSize:11}}>{r.date}</td>
                <td style={{padding:'12px 14px'}}><span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:6,background:'rgba(0,217,255,0.08)',color:c.cyan}}>{r.type}</span></td>
                <td style={{padding:'12px 14px',color:c.textMute,fontSize:11,fontFamily:'monospace'}}>{r.size}</td>
                <td style={{padding:'12px 14px'}}><span style={{fontSize:10,fontWeight:700,color:c.green}}>✓ {r.status}</span></td>
                <td style={{padding:'12px 14px'}}><button style={{padding:'5px 12px',background:'transparent',border:`1px solid ${c.border}`,borderRadius:6,color:c.textSub,fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>Download</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
//  SETTINGS PAGE — functional toggles
// ════════════════════════════════════════════════════════════════════
function Toggle({on,onChange}:{on:boolean;onChange:(v:boolean)=>void}){
  return (
    <div onClick={()=>onChange(!on)}
      style={{width:42,height:24,borderRadius:12,background:on?c.cyan:c.border,position:'relative',cursor:'pointer',transition:'background 0.2s',flexShrink:0}}>
      <div style={{position:'absolute',width:18,height:18,borderRadius:'50%',background:'white',top:3,left:on?21:3,transition:'left 0.2s',boxShadow:'0 1px 4px rgba(0,0,0,0.3)'}}/>
    </div>
  )
}

function SettingsPage(){
  const [notifState,setNotifState]=useState({email:true,sms:false,dashboard:true,criticalOnly:false})
  const [displayState,setDisplayState]=useState({darkMode:true,compactView:false,animations:true})
  const [opsState,setOpsState]=useState({autoOptimize:true,craneAlerts:true,capacityWarnings:true})

  function toggleNotif(k:keyof typeof notifState){
    setNotifState(p=>({...p,[k]:!p[k]}))
    showToast('Notification preferences updated','Settings saved.',c.cyan)
  }

  return (
    <div style={{padding:16,fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",maxWidth:680,overflowY:'auto',height:'100%'}}>
      <h2 style={{margin:'0 0 18px',color:c.text}}>Settings</h2>
      {/* Account */}
      <div style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:12,marginBottom:14,overflow:'hidden'}}>
        <div style={{padding:'10px 18px',borderBottom:`1px solid ${c.border}`,fontSize:10,fontWeight:700,color:c.textSub,letterSpacing:2}}>ACCOUNT</div>
        {[{l:'User ID',v:'PORT-SG-01'},{l:'Role',v:'Administrator'},{l:'Email',v:'ops@portiq.sg'},{l:'Terminal',v:'PORT-SG-01'}].map((f,i,arr)=>(
          <div key={f.l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'13px 18px',borderBottom:i<arr.length-1?`1px solid ${c.border}`:'none'}}>
            <span style={{fontSize:13,color:c.text}}>{f.l}</span>
            <span style={{fontSize:12,fontFamily:'monospace',color:c.textSub}}>{f.v}</span>
          </div>
        ))}
      </div>
      {/* Notifications */}
      <div style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:12,marginBottom:14,overflow:'hidden'}}>
        <div style={{padding:'10px 18px',borderBottom:`1px solid ${c.border}`,fontSize:10,fontWeight:700,color:c.textSub,letterSpacing:2}}>NOTIFICATIONS</div>
        {[
          {key:'email'       as const,label:'Email Alerts',       sub:'Receive alerts via email'},
          {key:'sms'         as const,label:'SMS Alerts',         sub:'Receive alerts via SMS'},
          {key:'dashboard'   as const,label:'Dashboard Notifications',sub:'Show notifications in app'},
          {key:'criticalOnly'as const,label:'Critical Alerts Only',sub:'Only notify for critical events'},
        ].map((item,i,arr)=>(
          <div key={item.key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'13px 18px',borderBottom:i<arr.length-1?`1px solid ${c.border}`:'none'}}>
            <div>
              <div style={{fontSize:13,color:c.text}}>{item.label}</div>
              <div style={{fontSize:10,color:c.textMute,marginTop:2}}>{item.sub}</div>
            </div>
            <Toggle on={notifState[item.key]} onChange={()=>toggleNotif(item.key)}/>
          </div>
        ))}
      </div>
      {/* Display */}
      <div style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:12,marginBottom:14,overflow:'hidden'}}>
        <div style={{padding:'10px 18px',borderBottom:`1px solid ${c.border}`,fontSize:10,fontWeight:700,color:c.textSub,letterSpacing:2}}>DISPLAY</div>
        {[
          {key:'darkMode'   as const,label:'Dark Mode',     sub:'Industrial dark theme'},
          {key:'compactView'as const,label:'Compact View',  sub:'Reduce spacing for more data'},
          {key:'animations' as const,label:'Animations',    sub:'Enable motion and transitions'},
        ].map((item,i,arr)=>(
          <div key={item.key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'13px 18px',borderBottom:i<arr.length-1?`1px solid ${c.border}`:'none'}}>
            <div>
              <div style={{fontSize:13,color:c.text}}>{item.label}</div>
              <div style={{fontSize:10,color:c.textMute,marginTop:2}}>{item.sub}</div>
            </div>
            <Toggle on={displayState[item.key]} onChange={v=>setDisplayState(p=>({...p,[item.key]:v}))}/>
          </div>
        ))}
      </div>
      {/* Operations */}
      <div style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:12,overflow:'hidden'}}>
        <div style={{padding:'10px 18px',borderBottom:`1px solid ${c.border}`,fontSize:10,fontWeight:700,color:c.textSub,letterSpacing:2}}>OPERATIONS</div>
        {[
          {key:'autoOptimize'     as const,label:'Auto-Optimize Retrieval',sub:'Automatically suggest optimizations'},
          {key:'craneAlerts'      as const,label:'Crane Status Alerts',    sub:'Alert on crane state changes'},
          {key:'capacityWarnings' as const,label:'Capacity Warnings',      sub:'Warn when block reaches 85%'},
        ].map((item,i,arr)=>(
          <div key={item.key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'13px 18px',borderBottom:i<arr.length-1?`1px solid ${c.border}`:'none'}}>
            <div>
              <div style={{fontSize:13,color:c.text}}>{item.label}</div>
              <div style={{fontSize:10,color:c.textMute,marginTop:2}}>{item.sub}</div>
            </div>
            <Toggle on={opsState[item.key]} onChange={v=>setOpsState(p=>({...p,[item.key]:v}))}/>
          </div>
        ))}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
//  LOGIN SCREEN
// ════════════════════════════════════════════════════════════════════
function LoginScreen({onLogin}:{onLogin:()=>void}){
  const [userId,setUserId]=useState('')
  const [password,setPassword]=useState('')
  const [error,setError]=useState('')
  const [shake,setShake]=useState(false)
  const [showDrop,setShowDrop]=useState(false)

  function fillDemo(){ setUserId(DEMO_USER); setPassword(DEMO_PASS); setError('') }
  function handleSignIn(){
    if(userId===DEMO_USER&&password===DEMO_PASS){ onLogin() }
    else{ setError('Invalid credentials.'); setShake(true); setTimeout(()=>setShake(false),600) }
  }

  const inp={width:'100%',padding:'11px 13px',background:c.inputBg,border:`1px solid ${c.border}`,borderRadius:8,color:c.text,fontSize:14,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}

  return (
    <div style={{minHeight:'100vh',background:c.bg,display:'flex',alignItems:'center',justifyContent:'center',
      backgroundImage:`radial-gradient(ellipse 800px 500px at 50% 0%,rgba(0,180,220,0.07) 0%,transparent 70%),radial-gradient(ellipse 600px 400px at 80% 100%,rgba(10,60,120,0.18) 0%,transparent 60%)`,
      fontFamily:"'Inter','Segoe UI',system-ui,sans-serif"}}>
      <div style={{position:'fixed',inset:0,pointerEvents:'none',backgroundImage:'linear-gradient(rgba(0,180,220,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,180,220,0.025) 1px,transparent 1px)',backgroundSize:'48px 48px'}}/>
      <div style={{position:'relative',width:'100%',maxWidth:430,padding:'0 20px'}}>
        {/* Brand */}
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:12,marginBottom:10}}>
            <div style={{width:44,height:44,background:`linear-gradient(135deg,${c.cyan},#0070a0)`,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 0 24px rgba(0,217,255,0.35)`}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 17l4-8 4 4 4-6 4 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><rect x="1" y="19" width="22" height="2" rx="1" fill="white" opacity="0.5"/></svg>
            </div>
            <div style={{textAlign:'left'}}>
              <div style={{fontSize:22,fontWeight:800,color:c.text,letterSpacing:2}}>PORTIQ</div>
              <div style={{fontSize:10,color:c.textSub,letterSpacing:3,fontWeight:500}}>YARD OPTIMIZER</div>
            </div>
          </div>
          <div style={{fontSize:12,color:c.textSub,letterSpacing:2}}>SMART PORT YARD OPTIMIZER</div>
        </div>
        {/* Card */}
        <div style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:16,padding:28,boxShadow:'0 24px 64px rgba(0,0,0,0.5)'}}>
          <h2 style={{margin:'0 0 20px',fontSize:18,fontWeight:700,color:c.text}}>Welcome back</h2>
          <div style={{display:'flex',flexDirection:'column',gap:12,animation:shake?'shake 0.5s ease':'none'}}>
            <div>
              <label style={{display:'block',fontSize:10,color:c.textSub,letterSpacing:1,marginBottom:5,fontWeight:700}}>USER ID</label>
              <input style={inp} value={userId} onChange={e=>{setUserId(e.target.value);setError('')}} onKeyDown={e=>e.key==='Enter'&&handleSignIn()} placeholder="Enter your user ID"/>
            </div>
            <div>
              <label style={{display:'block',fontSize:10,color:c.textSub,letterSpacing:1,marginBottom:5,fontWeight:700}}>PASSWORD</label>
              <input style={inp} type="password" value={password} onChange={e=>{setPassword(e.target.value);setError('')}} onKeyDown={e=>e.key==='Enter'&&handleSignIn()} placeholder="Enter your password"/>
            </div>
            {error&&<div style={{fontSize:11,color:c.red,background:'rgba(239,68,68,0.07)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:6,padding:'7px 11px'}}>{error}</div>}
            <button onClick={handleSignIn}
              style={{padding:'12px',background:`linear-gradient(135deg,${c.cyan},#0088aa)`,border:'none',borderRadius:8,color:'#000',fontSize:13,fontWeight:700,letterSpacing:1,cursor:'pointer',fontFamily:'inherit',boxShadow:`0 0 20px rgba(0,217,255,0.25)`,marginTop:4}}>
              SIGN IN
            </button>
          </div>
          {/* Demo credentials */}
          <div style={{marginTop:18,padding:14,background:'rgba(0,217,255,0.04)',border:`1px solid rgba(0,217,255,0.15)`,borderRadius:9}}>
            <div style={{fontSize:10,color:c.cyan,fontWeight:700,letterSpacing:1,marginBottom:7}}>DEMO CREDENTIALS</div>
            <div style={{display:'flex',gap:22,marginBottom:10}}>
              <div><span style={{fontSize:10,color:c.textMute}}>ID: </span><span style={{fontSize:12,color:c.text,fontWeight:600,fontFamily:'monospace'}}>user1</span></div>
              <div><span style={{fontSize:10,color:c.textMute}}>Password: </span><span style={{fontSize:12,color:c.text,fontWeight:600,fontFamily:'monospace'}}>12345</span></div>
            </div>
            <button onClick={fillDemo}
              style={{width:'100%',padding:'8px',background:'rgba(0,217,255,0.1)',border:`1px solid rgba(0,217,255,0.3)`,borderRadius:6,color:c.cyan,fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
              USE DEMO CREDENTIALS
            </button>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10,margin:'18px 0'}}>
            <div style={{flex:1,height:1,background:c.border}}/><span style={{fontSize:10,color:c.textMute,letterSpacing:1}}>OR</span><div style={{flex:1,height:1,background:c.border}}/>
          </div>
          <button onClick={onLogin}
            style={{width:'100%',padding:'14px 18px',background:'linear-gradient(135deg,rgba(34,197,94,0.15),rgba(16,185,129,0.08))',border:`2px solid ${c.green}`,borderRadius:10,color:c.green,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:`0 0 22px rgba(34,197,94,0.15)`,lineHeight:1.4}}>
            ⚡ ENTER DEMO MODE — NO LOGIN REQUIRED
          </button>
          <p style={{textAlign:'center',fontSize:10,color:c.textMute,margin:'8px 0 0'}}>Instant access to the PORTIQ operations dashboard.<br/>No ID or password required.</p>
        </div>
        <p style={{textAlign:'center',fontSize:10,color:c.textMute,marginTop:18}}>PORT-SG-01 · v2.4.1 · © 2026 PORTIQ Systems</p>
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}input::placeholder{color:${c.textMute};}input:focus{border-color:${c.cyanDim}!important;box-shadow:0 0 0 2px rgba(0,217,255,0.1);}@keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
//  MAIN APP
// ════════════════════════════════════════════════════════════════════
const PAGE_TITLES:Record<Nav,string>={
  overview:'PORTIQ — Smart Port Yard Optimizer',yardmap:'PORTIQ — Yard Map',
  containers:'PORTIQ — Container Management',craneops:'PORTIQ — Crane Operations',
  optimization:'PORTIQ — Optimization Center',analytics:'PORTIQ — Analytics',
  alerts:'PORTIQ — Alerts',reports:'PORTIQ — Reports',settings:'PORTIQ — Settings',
}

export default function App(){
  const [screen,setScreen]=useState<'login'|'dashboard'>('login')
  const [nav,setNav]=useState<Nav>('overview')
  const [searchQuery,setSearchQuery]=useState('')

  function handleSearch(v:string){ setSearchQuery(v) }
  function handleSearchSubmit(){ if(searchQuery.toUpperCase().includes('CNU')) setNav('yardmap') }

  if(screen==='login') return <LoginScreen onLogin={()=>setScreen('dashboard')}/>

  return (
    <div style={{display:'flex',minHeight:'100vh',background:c.bg,fontFamily:"'Inter','Segoe UI',system-ui,sans-serif"}}>
      <Sidebar nav={nav} setNav={setNav} onSignOut={()=>setScreen('login')}/>
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
        <Header title={PAGE_TITLES[nav]} searchValue={searchQuery} onSearch={handleSearch} onSearchSubmit={handleSearchSubmit} onNavYard={()=>setNav('yardmap')}/>
        <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
          {nav==='overview'     && <OverviewPage onNavYard={()=>setNav('yardmap')}/>}
          {nav==='yardmap'      && <YardMapPage searchQuery={searchQuery}/>}
          {nav==='containers'   && <ContainersPage/>}
          {nav==='craneops'     && <CraneOpsPage/>}
          {nav==='optimization' && <OptimizationPage/>}
          {nav==='analytics'    && <AnalyticsPage/>}
          {nav==='alerts'       && <AlertsPage/>}
          {nav==='reports'      && <ReportsPage/>}
          {nav==='settings'     && <SettingsPage/>}
        </div>
      </div>
      <ToastLayer/>
      <style>{`*{box-sizing:border-box;}body{margin:0;}button:hover{opacity:0.88;}::-webkit-scrollbar{width:5px;height:5px;}::-webkit-scrollbar-track{background:${c.bg};}::-webkit-scrollbar-thumb{background:${c.border};border-radius:3px;}input{color-scheme:dark;}`}</style>
    </div>
  )
}
