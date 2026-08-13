import React from 'react';
import { StyleSheet, View } from 'react-native';

import { SquareButton } from '@/src/components/SquareButton';

const BUTTON_SIZE = 72;

type ButtonsRowProps = {
  labels: string[];
  onPressLabel: (label: string) => void;
  rightLabels?: string[];
  onPressRightLabel?: (label: string) => void;
  disabledLabels?: string[];
};

export function ButtonsRow({
  labels,
  onPressLabel,
  rightLabels = [],
  onPressRightLabel,
  disabledLabels = [],
}: ButtonsRowProps) {
  const [rowWidth, setRowWidth] = React.useState(0);

  const leftGridWidth = rowWidth > 0 ? (2 * rowWidth + BUTTON_SIZE) / 3 : '72%';

  return (
    <View style={styles.row} onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}>
      <View style={[styles.leftGrid, { width: leftGridWidth }]}>
        {labels.map((label) => (
          <SquareButton
            key={label}
            label={label}
            onPress={() => onPressLabel(label)}
            disabled={disabledLabels.includes(label)}
          />
        ))}
      </View>
      <View style={styles.rightColumn}>
        {rightLabels.map((label) => {
          let variant: 'number' | 'action' | 'accent' | 'danger' = 'action';
          if (label === '✓') variant = 'accent';
          if (label === '⌫') variant = 'danger';
          return (
            <SquareButton
              key={label}
              label={label}
              onPress={() => onPressRightLabel?.(label)}
              variant={variant}
              textColor={label === '+' || label === '-' ? '#ff9f43' : undefined}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    marginBottom: 12,
  },
  leftGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rightColumn: {
    width: BUTTON_SIZE,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
});
