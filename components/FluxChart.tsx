import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { SimulationState } from '../types';

interface FluxChartProps {
  state: SimulationState;
}

const FluxChart: React.FC<FluxChartProps> = ({ state }) => {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    // Generate initial dummy data
    const initialData = [];
    for (let i = 0; i < 20; i++) {
        initialData.push({ time: i, co2: 50, o2: 45 });
    }
    setHistory(initialData);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setHistory(prev => {
        const now = new Date();
        const timeLabel = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
        // Add simulated sensor noise
        const noiseCO2 = (Math.random() - 0.5) * 4;
        const noiseO2 = (Math.random() - 0.5) * 3;
        
        const newPoint = {
            time: timeLabel,
            co2: Math.max(0, state.co2Flux + noiseCO2),
            o2: Math.max(0, state.o2Flux + noiseO2)
        };
        
        const newHistory = [...prev, newPoint];
        if (newHistory.length > 30) newHistory.shift();
        return newHistory;
      });
    }, 500); // 2Hz update rate
    return () => clearInterval(interval);
  }, [state.co2Flux, state.o2Flux]);

  return (
    <div className="h-40 w-full mt-2">
      <div className="flex justify-between items-center mb-2 px-2">
         <span className="text-[10px] text-gray-400 font-mono">GAS EXCHANGE RATES (nmol/cm²/s)</span>
         <div className="flex gap-3">
             <div className="flex items-center gap-1">
                 <div className="w-2 h-2 rounded-full bg-sci-green"></div>
                 <span className="text-[10px] text-sci-green font-mono">CO2 IN</span>
             </div>
             <div className="flex items-center gap-1">
                 <div className="w-2 h-2 rounded-full bg-sci-cyan"></div>
                 <span className="text-[10px] text-sci-cyan font-mono">O2 OUT</span>
             </div>
         </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={history}>
          <defs>
            <linearGradient id="colorCo2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00ff9d" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#00ff9d" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorO2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#00f0ff" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2544" vertical={false} />
          <XAxis dataKey="time" hide />
          <YAxis stroke="#64748b" fontSize={9} width={25} tickFormatter={(val) => Math.round(val).toString()} />
          <Tooltip 
            contentStyle={{backgroundColor: 'rgba(11, 13, 23, 0.9)', borderColor: '#1f2544', color: '#fff', fontSize: '12px'}}
            itemStyle={{fontFamily: 'monospace'}}
            labelStyle={{display: 'none'}}
          />
          <Area type="monotone" dataKey="co2" stroke="#00ff9d" strokeWidth={2} fillOpacity={1} fill="url(#colorCo2)" animationDuration={300} isAnimationActive={false} />
          <Area type="monotone" dataKey="o2" stroke="#00f0ff" strokeWidth={2} fillOpacity={1} fill="url(#colorO2)" animationDuration={300} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FluxChart;