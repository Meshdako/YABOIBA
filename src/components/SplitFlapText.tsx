import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const FLAP_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .-';

type SplitFlapTextProps = {
  value: string;
  style?: object;
  textStyle?: object;
};

export function SplitFlapText({ value, style, textStyle }: SplitFlapTextProps) {
  const [display, setDisplay] = React.useState(value);
  const timersRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);

  React.useEffect(() => {
    const timers = timersRef.current;
    timers.forEach(clearTimeout);
    timers.length = 0;

    const target = value;
    const maxLen = Math.max(display.length, target.length);
    const chars = Array.from({ length: maxLen }, (_, i) => target[i] ?? ' ');

    chars.forEach((finalChar, index) => {
      const startDelay = index * 45;
      const flipCount = 4;
      for (let f = 0; f < flipCount; f += 1) {
        const t = setTimeout(() => {
          setDisplay((prev) => {
            const arr = prev.split('');
            while (arr.length < maxLen) arr.push(' ');
            const randomChar = FLAP_CHARS[Math.floor(Math.random() * FLAP_CHARS.length)];
            arr[index] = randomChar;
            return arr.join('');
          });
        }, startDelay + f * 40);
        timers.push(t);
      }
      const settle = setTimeout(() => {
        setDisplay((prev) => {
          const arr = prev.split('');
          while (arr.length < maxLen) arr.push(' ');
          arr[index] = finalChar;
          return arr.join('');
        });
      }, startDelay + flipCount * 40 + 20);
      timers.push(settle);
    });

    return () => {
      timers.forEach(clearTimeout);
      timers.length = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.text, textStyle]} numberOfLines={1}>
        {display}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  text: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
