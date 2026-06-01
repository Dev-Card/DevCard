import React from 'react';
import { View, Text, Image, ViewStyle, ImageStyle, StyleSheet } from 'react-native';
import { COLORS } from '../theme/tokens';

type Props = {
  uri?: string | null;
  name?: string;
  size?: number;
  style?: ViewStyle | ImageStyle;
};

export const Avatar: React.FC<Props> = ({ uri, name = 'D', size = 56, style }) => {
  const initials = name.charAt(0).toUpperCase();
  const imageStyle = [{ width: size, height: size, borderRadius: size / 2 } as ImageStyle, style as ImageStyle];
  const placeholderStyle = [{ width: size, height: size, borderRadius: size / 2, backgroundColor: COLORS.primary }, style as ViewStyle];

  return uri ? (
    <Image source={{ uri }} style={imageStyle} />
  ) : (
    <View style={[styles.placeholder, ...placeholderStyle]}>
      <Text style={[styles.placeholderText, { fontSize: Math.round(size / 2) }]}>{initials}</Text>
    </View>
  );
};

export default Avatar;

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: COLORS.white,
    fontWeight: '800',
  },
});
