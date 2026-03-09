import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { Database, HardDrive, FileArchive, Activity } from 'lucide-react';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface DashboardTabProps {
    isDarkMode: boolean;
    authFetch: (url: string, options?: RequestInit) => Promise<Response>;
    API_BASE: string;
}

export default function DashboardTab({ isDarkMode, authFetch, API_BASE }: DashboardTabProps) {
    const [vectorStats, setVectorStats] = React.useState<any>(null);
    const [dynamoItems, setDynamoItems] = React.useState<any>(null);
    const [weeklyStats, setWeeklyStats] = React.useState<any[]>([]);
    const [s3Files, setS3Files] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        let isMounted = true;
        const fetchDashboardStats = async () => {
            setLoading(true);
            try {
                const [vecRes, dynRes, s3Res, statsRes] = await Promise.all([
                    authFetch(`${API_BASE}/api/admin/vectors/stats`),
                    authFetch(`${API_BASE}/api/admin/dynamodb?limit=1`),
                    authFetch(`${API_BASE}/api/admin/s3`),
                    authFetch(`${API_BASE}/api/admin/dynamodb/stats`)
                ]);

                if (!isMounted) return;
                setVectorStats(await vecRes.json());
                setDynamoItems(await dynRes.json());
                setS3Files(await s3Res.json());
                setWeeklyStats(await statsRes.json());
            } catch (err) {
                console.error("Failed to fetch dashboard stats", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchDashboardStats();
        return () => { isMounted = false; };
    }, [authFetch, API_BASE]);

    // Fallback static data if backend returns empty/error
    const usageData = weeklyStats && weeklyStats.length > 0 ? weeklyStats : [
        { name: 'Mon', queries: 0, documents: 0 },
        { name: 'Tue', queries: 0, documents: 0 },
        { name: 'Wed', queries: 0, documents: 0 },
        { name: 'Thu', queries: 0, documents: 0 },
        { name: 'Fri', queries: 0, documents: 0 },
        { name: 'Sat', queries: 0, documents: 0 },
        { name: 'Sun', queries: 0, documents: 0 },
    ];

    const COLORS = ['#2A6CF0', '#4CB782', '#A855F7', '#F97316', '#E45454'];
    
    // Process pie chart data directly from backend if available, padding if none exist yet.
    const pieData = vectorStats?.type_distribution?.length > 0 
        ? vectorStats.type_distribution 
        : [{ name: 'No Data Indexed', value: 1 }];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { title: 'Active Vectors', value: vectorStats?.doc_count ?? '...', sub: 'Indexed search nodes', color: 'text-[#2A6CF0]', icon: <Database /> },
                    { title: 'Vector DB Health', value: vectorStats?.status?.toUpperCase() || '...', sub: 'OpenSearch cluster', color: vectorStats?.status === 'green' ? 'text-[#4CB782]' : 'text-[#F4B740]', icon: <Activity /> },
                    { title: 'Recent Queries', value: dynamoItems?.count ?? '...', sub: 'Analysis requests', color: 'text-[#A855F7]', icon: <HardDrive /> },
                    { title: 'S3 Buckets', value: s3Files?.count ?? s3Files?.files?.length ?? '...', sub: 'Uploaded files', color: 'text-[#F97316]', icon: <FileArchive /> },
                ].map((kpi, idx) => (
                    <div key={idx} className={`p-5 rounded-2xl border transition-colors ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.04)]'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{kpi.title}</p>
                            <div className={`${kpi.color} opacity-80`}>{kpi.icon}</div>
                        </div>
                        <h3 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{kpi.value}</h3>
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{kpi.sub}</p>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className={`col-span-2 p-6 rounded-2xl border transition-colors ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.04)]'}`}>
                    <h3 className={`text-lg font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>System Usage (Weekly)</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={usageData}>
                                <XAxis dataKey="name" stroke={isDarkMode ? "#64748b" : "#94a3b8"} fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke={isDarkMode ? "#64748b" : "#94a3b8"} fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: isDarkMode ? '#1e293b' : '#fff', color: isDarkMode ? '#fff' : '#000', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }} />
                                <Bar dataKey="queries" fill="#2A6CF0" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="documents" fill="#4CB782" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className={`col-span-1 p-6 rounded-2xl border transition-colors ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.04)]'}`}>
                    <h3 className={`text-lg font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Document Types</h3>
                    <div className="h-64 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                    {pieData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: isDarkMode ? '#1e293b' : '#fff', color: isDarkMode ? '#fff' : '#000' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 mt-2">
                        {pieData.map((entry: any, index: number) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>{entry.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Map Section */}
            <div className={`p-6 rounded-2xl border transition-colors ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.04)]'}`}>
                <h3 className={`text-lg font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Service Focus Regions</h3>
                <div className={`h-[400px] w-full rounded-xl overflow-hidden ${isDarkMode ? 'bg-gray-900/50' : 'bg-blue-50/50'}`}>
                    <ComposableMap projection="geoMercator" projectionConfig={{ scale: 800, center: [78.9629, 22.5937] }}>
                        <Geographies geography={geoUrl}>
                            {({ geographies }: { geographies: any[] }) =>
                                geographies.map((geo: any) => (
                                    <Geography key={geo.rsmKey} geography={geo}
                                        fill={isDarkMode ? '#334155' : '#e2e8f0'}
                                        stroke={isDarkMode ? '#1e293b' : '#ffffff'}
                                        style={{ default: { outline: 'none' }, hover: { fill: '#2A6CF0', outline: 'none' } }} />
                                ))
                            }
                        </Geographies>
                        <Marker coordinates={[77.2090, 28.6139]}>
                            <circle r={6} fill="#E45454" />
                            <text textAnchor="middle" y={-15} style={{ fontFamily: "system-ui", fill: isDarkMode ? "#fff" : "#1e293b", fontSize: "12px", fontWeight: "bold" }}>Delhi</text>
                        </Marker>
                        <Marker coordinates={[72.8777, 19.0760]}>
                            <circle r={5} fill="#2A6CF0" />
                            <text textAnchor="start" x={10} y={5} style={{ fontFamily: "system-ui", fill: isDarkMode ? "#cbd5e1" : "#64748b", fontSize: "10px" }}>Mumbai</text>
                        </Marker>
                        <Marker coordinates={[91.7362, 26.1445]}>
                            <circle r={4} fill="#4CB782" />
                            <text textAnchor="end" x={-10} y={5} style={{ fontFamily: "system-ui", fill: isDarkMode ? "#cbd5e1" : "#64748b", fontSize: "10px" }}>Assam</text>
                        </Marker>
                    </ComposableMap>
                </div>
            </div>
        </div>
    );
}
