import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

export type ChartSeries = {
  name: string;
  color: string;
  values: number[];
  dashed?: boolean;
};

type Props = {
  series: ChartSeries[];
  labels: string[];
  height?: number;
};

const PAD_LEFT = 44;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;

const formatAxis = (value: number) => {
  const abs = Math.abs(value);
  if (abs >= 1000) {
    return `${(value / 1000).toFixed(1).replace('.', ',')}k`;
  }
  return String(Math.round(value));
};

export default function LineChart({ series, labels, height = 240 }: Props) {
  const width = 340;
  const chartW = width - PAD_LEFT - PAD_RIGHT;
  const chartH = height - PAD_TOP - PAD_BOTTOM;

  const allValues = series.flatMap((s) => s.values);
  const hasData = allValues.length > 0;
  const rawMin = hasData ? Math.min(...allValues) : 0;
  const rawMax = hasData ? Math.max(...allValues) : 0;
  const min = Math.min(0, rawMin);
  const max = Math.max(0, rawMax);
  const range = max - min || 1;

  const xFor = (i: number) =>
    PAD_LEFT + (labels.length <= 1 ? chartW / 2 : (i / (labels.length - 1)) * chartW);
  const yFor = (v: number) => PAD_TOP + ((max - v) / range) * chartH;

  const buildPath = (values: number[]) =>
    values
      .map((v, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`)
      .join(' ');

  const gridLines = 4;

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const value = min + (range * i) / gridLines;
          const y = yFor(value);
          return (
            <React.Fragment key={i}>
              <Line
                x1={PAD_LEFT}
                y1={y}
                x2={width - PAD_RIGHT}
                y2={y}
                stroke="#2a2a2a"
                strokeWidth={1}
              />
              <SvgText
                x={PAD_LEFT - 6}
                y={y + 4}
                fontSize={10}
                fill="#666"
                textAnchor="end"
              >
                {formatAxis(value)}
              </SvgText>
            </React.Fragment>
          );
        })}

        {labels.map((label, i) => (
          <SvgText
            key={`${label}-${i}`}
            x={xFor(i)}
            y={height - 8}
            fontSize={10}
            fill="#666"
            textAnchor="middle"
          >
            {label}
          </SvgText>
        ))}

        {series.map((s) => (
          <Path
            key={s.name}
            d={buildPath(s.values)}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeDasharray={s.dashed ? '6 4' : undefined}
          />
        ))}

        {series
          .filter((s) => !s.dashed)
          .map((s) =>
            s.values.map((v, i) => (
              <Circle
                key={`${s.name}-${i}`}
                cx={xFor(i)}
                cy={yFor(v)}
                r={3}
                fill={s.color}
              />
            ))
          )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
});
