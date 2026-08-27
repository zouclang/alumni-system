'use client';

import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

interface MapData {
  name: string;
  value: number;
}

interface MapChartProps {
  data: MapData[];
  type: 'china' | 'suzhou';
  title: string;
}

export default function MapChart({ data, type, title }: MapChartProps) {
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    const loadMap = async () => {
      try {
        const url = type === 'china' ? '/maps/china.json' : '/maps/suzhou.json';
        const response = await fetch(url);
        const geoJson = await response.json();
        
        echarts.registerMap(type, geoJson);
        setMapLoaded(true);
      } catch (error) {
        console.error('Failed to load map:', error);
      }
    };

    loadMap();
  }, [type]);

  if (!mapLoaded) {
    return <div className="loading-container" style={{ height: '400px' }}><div className="spinner" /></div>;
  }

  // Canonical names mapping for China Provinces
  const provinceMapper = (name: string) => {
    if (!name) return name;
    // Map database simplified province names to GeoJSON full names
    const special = {
      '内蒙古': '内蒙古自治区',
      '西藏': '西藏自治区',
      '宁夏': '宁夏回族自治区',
      '广西': '广西壮族自治区',
      '新疆': '新疆维吾尔自治区',
      '北京': '北京市',
      '天津': '天津市',
      '上海': '上海市',
      '重庆': '重庆市',
      '香港': '香港特别行政区',
      '澳门': '澳门特别行政区'
    };
    if (special[name as keyof typeof special]) return special[name as keyof typeof special];
    return `${name}${name.endsWith('省') ? '' : '省'}`;
  };

  // Canonical names mapping for Suzhou Districts/Cities
  const suzhouMapper = (name: string) => {
    if (!name) return name;
    const cleanName = name.trim();
    if (cleanName.includes('工业园区')) return '工业园区';
    if (cleanName.includes('高新区') || cleanName.includes('新市')) return '虎丘区'; // Mapping High-tech to Huqiu
    
    const cities = ['昆山', '常熟', '张家港', '太仓'];
    const cityMatch = cities.find(c => cleanName.includes(c));
    if (cityMatch) return cityMatch; // No suffix for cities in new suzhou_sip.json
    
    const districts = ['吴中', '吴江', '相城', '姑苏', '虎丘'];
    const districtMatch = districts.find(d => cleanName.includes(d));
    if (districtMatch) return `${districtMatch}区`;
    
    return cleanName;
  };

  // Aggregation Logic
  const aggregated: Record<string, number> = {};
  data.forEach(item => {
    let name = item.name;
    const value = Number(item.value) || 0;
    
    if (type === 'china') {
      // Extract province part: "江苏-苏州市" -> "江苏"
      name = name.split('-')[0].trim();
      if (!name) return;
      name = provinceMapper(name);
    } else {
      // Suzhou Map
      name = suzhouMapper(name);
    }
    
    if (name) {
      aggregated[name] = (aggregated[name] || 0) + value;
    }
  });

  const processedData = Object.entries(aggregated).map(([name, value]) => ({ name, value }));
  const maxVal = processedData.length > 0 ? Math.max(...processedData.map(d => d.value)) : 10;

  const option = {
    title: {
      text: title,
      left: 'center',
      textStyle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1e293b'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        return `${params.name}: ${params.value || 0} 人`;
      }
    },
    visualMap: {
      min: 0,
      max: maxVal,
      left: 'left',
      top: 'bottom',
      text: ['高', '低'],
      calculable: true,
      inRange: {
        color: type === 'china' ? ['#e0f2fe', '#0284c7'] : ['#f0fdf4', '#16a34a']
      }
    },
    series: [
      {
        name: title,
        type: 'map',
        map: type,
        emphasis: {
          label: {
            show: true
          },
          itemStyle: {
            areaColor: '#fbbf24'
          }
        },
        data: processedData,
        // For Suzhou map, we want to zoom in correctly
        zoom: type === 'suzhou' ? 1.2 : 1.0,
        layoutCenter: type === 'china' ? ['50%', '50%'] : undefined,
        layoutSize: type === 'china' ? '100%' : undefined,
        label: {
          show: true, // Always show labels on the map as requested
          fontSize: type === 'suzhou' ? 10 : 11,
          fontWeight: type === 'china' ? 'bold' : 'normal',
          color: '#334155',
          formatter: (params: any) => {
            // Only show labels for regions with data to avoid clutter
            if (!params.value) return '';
            // For China map, show only values as requested. For Suzhou, show Name + Value.
            return type === 'china' ? `${params.value}` : `${params.name}\n${params.value}`;
          }
        }
      }
    ]
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: '450px', width: '100%' }}
      notMerge={true}
      lazyUpdate={true}
    />
  );
}
