"use client";

import React from "react";

export function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

export function intToHSL(i: number): string {
  const hue = Math.abs(i) % 360;
  return `hsl(${hue}, 80%, 60%)`;
}

export function GradientAvatar({ id }: { id: string }) {
  const hash1 = hashCode(id);
  const hash2 = hashCode(id + "salt");
  const color1 = intToHSL(hash1);
  const color2 = intToHSL(hash2);
  const svg = `
    <svg width="100%" height="100%" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient x1="0%" y1="0%" x2="100%" y2="100%" id="g">
          <stop stop-color="${color1}" offset="0%"></stop>
          <stop stop-color="${color2}" offset="100%"></stop>
        </linearGradient>
      </defs>
      <rect fill="url(#g)" x="0" y="0" width="80" height="80"></rect>
    </svg>
  `;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        overflow: "hidden",
        display: "block",
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export default GradientAvatar;
