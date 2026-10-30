import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { AnimatedRollingNumber } from 'react-native-animated-rolling-numbers';
import { Easing } from 'react-native-reanimated';

type RollingMoneyProps = {
  value: number;
  text: string;
  textStyle?: StyleProp<TextStyle>;
};

export function RollingMoney({ value, text, textStyle }: RollingMoneyProps) {
  return (
    <AnimatedRollingNumber
      value={value}
      formattedText={text}
      textStyle={textStyle}
      spinningAnimationConfig={{ duration: 450, easing: Easing.out(Easing.cubic) }}
    />
  );
}
