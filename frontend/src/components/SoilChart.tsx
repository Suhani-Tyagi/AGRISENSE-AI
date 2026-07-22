import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, Legend } from 'recharts';

interface Reading {
  id: number;
  timestamp: string;
  soil_moisture: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  ph: number;
}

interface SoilChartProps {
  data: Reading[];
  days: number;
}

export const SoilChart: React.FC<SoilChartProps> = ({ data, days }) => {
  // Filter data based on days (each day has 2 readings, so days * 2 readings)
  const limit = days * 2;
  const chartData = data.slice(-limit).map(d => ({
    ...d,
    formattedDate: new Date(d.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }));

  if (chartData.length === 0) {
    return <div className="text-center text-earth-500 py-10">No reading history available.</div>;
  }

  return (
    <div className="space-y-8">
      {/* Soil Moisture Chart */}
      <div className="bg-white dark:bg-forest-800 p-4 rounded-xl border border-earth-200 dark:border-forest-700">
        <h4 className="text-sm font-semibold text-earth-700 dark:text-forest-300 mb-4">Soil Moisture Trend (%)</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2e7d32" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#2e7d32" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e5dd" />
              <XAxis dataKey="formattedDate" stroke="#7c776e" fontSize={11} />
              <YAxis stroke="#7c776e" fontSize={11} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e8e5dd' }} />
              <Area type="monotone" dataKey="soil_moisture" name="Moisture" stroke="#2e7d32" strokeWidth={2} fillOpacity={1} fill="url(#colorMoisture)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* NPK Nutrients Chart */}
      <div className="bg-white dark:bg-forest-800 p-4 rounded-xl border border-earth-200 dark:border-forest-700">
        <h4 className="text-sm font-semibold text-earth-700 dark:text-forest-300 mb-4">Soil Nutrients (NPK Levels - ppm)</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e5dd" />
              <XAxis dataKey="formattedDate" stroke="#7c776e" fontSize={11} />
              <YAxis stroke="#7c776e" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e8e5dd' }} />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Line type="monotone" dataKey="nitrogen" name="Nitrogen (N)" stroke="#c83f23" strokeWidth={2} activeDot={{ r: 6 }} dot={false} />
              <Line type="monotone" dataKey="phosphorus" name="Phosphorus (P)" stroke="#1e4620" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="potassium" name="Potassium (K)" stroke="#a0522d" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* pH Level Chart */}
      <div className="bg-white dark:bg-forest-800 p-4 rounded-xl border border-earth-200 dark:border-forest-700">
        <h4 className="text-sm font-semibold text-earth-700 dark:text-forest-300 mb-4">Soil pH Trend</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e5dd" />
              <XAxis dataKey="formattedDate" stroke="#7c776e" fontSize={11} />
              <YAxis stroke="#7c776e" fontSize={11} domain={[4, 10]} ticks={[4, 5, 6, 7, 8, 9, 10]} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e8e5dd' }} />
              <Line type="monotone" dataKey="ph" name="pH Value" stroke="#8d6e63" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
