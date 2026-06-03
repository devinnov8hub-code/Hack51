import { BarChart, XAxis, YAxis, Tooltip, Bar, Legend, CartesianGrid } from 'recharts';
// import { RechartsDevtools } from '@recharts/devtools';

// #region Sample data
const rangeData = [
  { day: '05-01', temperature: [-1, 10] },
  { day: '05-02', temperature: [2, 15] },
  { day: '05-03', temperature: [3, 12] },
  { day: '05-04', temperature: [4, 12] },
  { day: '05-05', temperature: [12, 16] },
  { day: '05-06', temperature: [5, 16] },
  { day: '05-07', temperature: [3, 12] },
  { day: '05-08', temperature: [0, 8] },
  { day: '05-09', temperature: [-3, 5] },
];

const data = [
  {
    name: 'Mon',
    uv: 4000,
    pv: 2400,
  },
  {
    name: 'Tue',
    uv: 3000,
    pv: 1398,
  },
  {
    name: 'Wed',
    uv: 2000,
    pv: 9800,
  },
  {
    name: 'Thur',
    uv: 2780,
    pv: 3908,
  },
  {
    name: 'Fri',
    uv: 1890,
    pv: 4800,
  },
  {
    name: 'Sat',
    uv: 2390,
    pv: 3800,
  },
  {
    name: 'Sun',
    uv: 3490,
    pv: 4300,
  },
];

// #endregion
const EvaluationBarChart = () => (
 
    <BarChart
      style={{ width: '100%', maxWidth: '600px', maxHeight: '70vh', aspectRatio: 1.618 }}
      responsive
      data={data}
      margin={{
        top: 5,
        right: 0,
        left: 0,
        bottom: 5,
      }}
    >
      <CartesianGrid strokeDasharray="1 3" />
      <XAxis dataKey="name" />
      <YAxis width="auto" />
      <Tooltip />
      <Legend />
      <Bar dataKey="pv" fill="#ff0046" activeBar={{ fill: "#FFBBC1", stroke: '#ff0046' }} radius={[10, 10, 0, 0]} />
      {/* <Bar dataKey="uv" fill="#82ca9d" activeBar={{ fill: 'gold', stroke: 'purple' }} radius={[10, 10, 0, 0]} /> */}
      {/* <RechartsDevtools /> */}
    </BarChart>
  );


export default EvaluationBarChart;