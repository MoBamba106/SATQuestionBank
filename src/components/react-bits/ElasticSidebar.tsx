import React, { useCallback, useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useMotionValueEvent, useTransform } from 'motion/react';

import { Minus, Plus } from 'lucide-react';

import './ElasticSidebar.css';

const MAX_OVERFLOW = 50;

type Region = 'left' | 'middle' | 'right';

type SliderBounds = {
  left: number;
  right: number;
  width: number;
  midpoint: number;
};

interface ElasticSliderProps {
  defaultValue?: number;
  startingValue?: number;
  maxValue?: number;
  className?: string;
  isStepped?: boolean;
  stepSize?: number;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onChange?: (val: number) => void;
}

const ElasticSlider: React.FC<ElasticSliderProps> = ({
  defaultValue = 50,
  startingValue = 0,
  maxValue = 100,
  className = '',
  isStepped = false,
  stepSize = 1,
  leftIcon = <Minus size={18} />,
  rightIcon = <Plus size={18} />,
  onChange
}) => {
  return (
    <div className={`slider-container ${className} !max-w-none w-full`}>
      <Slider
        defaultValue={defaultValue}
        startingValue={startingValue}
        maxValue={maxValue}
        isStepped={isStepped}
        stepSize={stepSize}
        leftIcon={leftIcon}
        rightIcon={rightIcon}
        onChange={onChange}
      />
    </div>
  );
};

interface SliderProps {
  defaultValue: number;
  startingValue: number;
  maxValue: number;
  isStepped: boolean;
  stepSize: number;
  leftIcon: React.ReactNode;
  rightIcon: React.ReactNode;
  onChange?: (val: number) => void;
}

const Slider: React.FC<SliderProps> = ({
  defaultValue,
  startingValue,
  maxValue,
  isStepped,
  stepSize,
  leftIcon,
  rightIcon,
  onChange
}) => {
  const [value, setValue] = useState<number>(defaultValue);
  const [displayRegion, setDisplayRegion] = useState<Region>('middle');
  const sliderRef = useRef<HTMLDivElement>(null);
  const boundsRef = useRef<SliderBounds>({ left: 0, right: 0, width: 1, midpoint: 0.5 });

  const clientX = useMotionValue(0);
  const overflow = useMotionValue(0);
  const scale = useMotionValue(1);

  const wrapperOpacity = useTransform(scale, [1, 1.2], [0.7, 1]);
  const leftIconX = useTransform(() =>
    displayRegion === 'left' ? -overflow.get() / Math.max(scale.get(), 0.001) : 0,
  );
  const rightIconX = useTransform(() =>
    displayRegion === 'right' ? overflow.get() / Math.max(scale.get(), 0.001) : 0,
  );
  const trackScaleX = useTransform(overflow, latest => 1 + latest / Math.max(boundsRef.current.width, 1));
  const trackScaleY = useTransform(overflow, [0, MAX_OVERFLOW], [1, 0.8]);
  const transformOrigin = useTransform(() =>
    clientX.get() < boundsRef.current.midpoint ? 'right' : 'left',
  );
  const trackHeight = useTransform(scale, [1, 1.2], [6, 12]);
  const trackMargin = useTransform(scale, [1, 1.2], [0, -3]);

  const measureSlider = useCallback(() => {
    if (!sliderRef.current) return boundsRef.current;
    const { left, width } = sliderRef.current.getBoundingClientRect();
    const next = { left, right: left + width, width: Math.max(width, 1), midpoint: left + width / 2 };
    boundsRef.current = next;
    return next;
  }, []);

  useEffect(() => {
    onChange?.(value);
  }, [onChange, value]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setValue(defaultValue));
    return () => window.cancelAnimationFrame(frame);
  }, [defaultValue]);

  useEffect(() => {
    const handleResize = () => {
      measureSlider();
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [measureSlider]);

  useMotionValueEvent(clientX, 'change', latest => {
    const bounds = boundsRef.current;
    let nextRegion: Region = 'middle';
    let overflowPixels = 0;

    if (latest < bounds.left) {
      nextRegion = 'left';
      overflowPixels = bounds.left - latest;
    } else if (latest > bounds.right) {
      nextRegion = 'right';
      overflowPixels = latest - bounds.right;
    }

    setDisplayRegion(region => (region === nextRegion ? region : nextRegion));
    overflow.jump(decay(overflowPixels, MAX_OVERFLOW));
  });

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.buttons <= 0) return;
      const bounds = measureSlider();
      let nextValue =
        startingValue + ((e.clientX - bounds.left) / bounds.width) * (maxValue - startingValue);

      if (isStepped) nextValue = Math.round(nextValue / stepSize) * stepSize;
      nextValue = Math.min(Math.max(nextValue, startingValue), maxValue);

      setValue(nextValue);
      clientX.jump(e.clientX);
    },
    [clientX, isStepped, maxValue, measureSlider, startingValue, stepSize],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      measureSlider();
      handlePointerMove(e);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [handlePointerMove, measureSlider],
  );

  const handlePointerEnd = useCallback(() => {
    animate(overflow, 0, { type: 'spring', bounce: 0.35, stiffness: 260, damping: 24 });
    setDisplayRegion('middle');
  }, [overflow]);

  const rangePercentage = (() => {
    const totalRange = maxValue - startingValue;
    if (totalRange === 0) return 0;
    return ((value - startingValue) / totalRange) * 100;
  })();

  return (
    <>
      <motion.div
        onHoverStart={() => animate(scale, 1.2)}
        onHoverEnd={() => animate(scale, 1)}
        onTouchStart={() => animate(scale, 1.2)}
        onTouchEnd={() => animate(scale, 1)}
        style={{ scale, opacity: wrapperOpacity }}
        className="slider-wrapper"
      >
        <motion.div
          animate={{
            scale: displayRegion === 'left' ? [1, 1.35, 1] : 1,
            transition: { duration: 0.22 }
          }}
          style={{ x: leftIconX }}
        >
          {leftIcon}
        </motion.div>

        <div
          ref={sliderRef}
          className="slider-root"
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onLostPointerCapture={handlePointerEnd}
        >
          <motion.div
            style={{
              scaleX: trackScaleX,
              scaleY: trackScaleY,
              transformOrigin,
              height: trackHeight,
              marginTop: trackMargin,
              marginBottom: trackMargin
            }}
            className="slider-track-wrapper"
          >
            <div className="slider-track">
              <div className="slider-range" style={{ width: `${rangePercentage}%` }} />
            </div>
          </motion.div>
        </div>

        <motion.div
          animate={{
            scale: displayRegion === 'right' ? [1, 1.35, 1] : 1,
            transition: { duration: 0.22 }
          }}
          style={{ x: rightIconX }}
        >
          {rightIcon}
        </motion.div>
      </motion.div>
      <p className="value-indicator">{Math.round(value)}</p>
    </>
  );
};

function decay(value: number, max: number): number {
  if (max === 0) return 0;
  const entry = value / max;
  const sigmoid = 2 * (1 / (1 + Math.exp(-entry)) - 0.5);
  return sigmoid * max;
}

export default ElasticSlider;
