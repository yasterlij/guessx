import React, { useRef, useState, useEffect, useCallback } from 'react'
import {
  View, TouchableOpacity, ScrollView, Dimensions, StyleSheet, Text,
} from 'react-native'
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SmartImage } from './SmartImage'
import { colors } from '../theme'

const { width: SCREEN_W } = Dimensions.get('window')

type ImageCarouselProps = {
  images: string[]
  alt?: string
  containerWidth?: number
  autoPlayInterval?: number
  showThumbnails?: boolean
  onImagePress?: (index: number) => void
  overlay?: React.ReactNode
}

export function ImageCarousel({
  images,
  alt = '',
  containerWidth = SCREEN_W,
  autoPlayInterval = 4000,
  showThumbnails = false,
  onImagePress,
  overlay,
}: ImageCarouselProps) {
  const scrollRef = useRef<ScrollView>(null)
  const [current, setCurrent] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const total = images.length

  const CARD_W = containerWidth - 32
  const SLIDE_H = CARD_W * (3 / 4)

  const goTo = useCallback((i: number) => {
    const idx = (i + total) % total
    setCurrent(idx)
    scrollRef.current?.scrollTo({ x: idx * CARD_W, animated: true })
  }, [total, CARD_W])

  const next = useCallback(() => goTo(current + 1), [goTo, current])
  const prev = useCallback(() => goTo(current - 1), [goTo, current])

  useEffect(() => {
    if (total <= 1 || isPaused) return
    const id = setInterval(next, autoPlayInterval)
    return () => clearInterval(id)
  }, [next, total, isPaused, autoPlayInterval])

  const onMomentumEnd = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_W)
    setCurrent(idx)
  }

  if (!images.length) return null

  return (
    <View
      style={styles.wrapper}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setTimeout(() => setIsPaused(false), 2000)}
    >
      <LinearGradient
        colors={['rgba(0,43,92,0.10)', 'rgba(200,166,66,0.08)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.wrapperGlow}
        pointerEvents="none"
      />
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_W}
        snapToAlignment="center"
        decelerationRate="fast"
        style={styles.scrollView}
        contentContainerStyle={{ gap: 0 }}
        onMomentumScrollEnd={onMomentumEnd}
        scrollEventThrottle={16}
      >
        {images.map((src, i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={0.95}
            onPress={() => onImagePress?.(i)}
            style={[styles.slide, { width: CARD_W, height: SLIDE_H }]}
          >
            <SmartImage
              uri={src}
              alt={`${alt} ${i + 1}`}
              style={styles.image}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {overlay}

      {total > 1 && (
        <>
          <TouchableOpacity
            onPress={prev}
            style={styles.arrowLeft}
            activeOpacity={0.7}
          >
            <ChevronLeft size={20} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={next}
            style={styles.arrowRight}
            activeOpacity={0.7}
          >
            <ChevronRight size={20} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.dots}>
            {images.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => goTo(i)} activeOpacity={0.7}>
                <View style={[styles.dot, i === current && styles.dotActive]} />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.progress}>
            <View style={[styles.progressBar, { width: `${((current + 1) / total) * 100}%` }]} />
          </View>
        </>
      )}

      {showThumbnails && total > 1 && (
        <View style={styles.thumbnails}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 8 }}>
            {images.map((src, i) => (
              <TouchableOpacity key={i} onPress={() => goTo(i)} activeOpacity={0.7}>
                <View style={[styles.thumb, i === current && styles.thumbActive]}>
                  <SmartImage uri={src} alt="" style={styles.thumbImg} resizeMode="cover" />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.neutralGray100,
    shadowColor: colors.awashBlue,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  wrapperGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
  },
  scrollView: {
    width: '100%',
  },
  slide: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  arrowLeft: {
    position: 'absolute',
    left: 8,
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowRight: {
    position: 'absolute',
    right: 8,
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    width: 20,
    backgroundColor: '#FFF',
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  progress: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  thumbnails: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbActive: {
    borderColor: colors.primary,
    opacity: 1,
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
})
