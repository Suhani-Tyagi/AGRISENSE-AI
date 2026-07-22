import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface PriceChartProps {
  history: number[];
  crop: string;
}

export const PriceChart: React.FC<PriceChartProps> = ({ history, crop }) => {
  const chartData = history.map((val, idx) => ({
    week: `Wk ${idx + 1}`,
    price: val
  }));

  return (
    <div className="bg-white dark:bg-forest-800 p-4 rounded-xl border border-earth-200 dark:border-forest-700">
      <h4 className="text-xs font-bold uppercase tracking-wider text-earth-500 dark:text-forest-400 mb-4">
        {crop} Regional Mandi Price Trend (Last 5 Weeks)
      </h4>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e5dd" />
            <XAxis dataKey="week" stroke="#7c776e" fontSize={11} />
            <YAxis stroke="#7c776e" fontSize={11} domain={['auto', 'auto']} />
            <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e8e5dd' }} />
            <Line type="monotone" dataKey="price" name="Mandi Price (INR)" stroke="#a0522d" strokeWidth={2.5} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
