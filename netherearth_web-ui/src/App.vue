<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { Engine, Scene } from '@babylonjs/core';
import { createScene } from './scene';

const canvas = ref<HTMLCanvasElement | null>(null);

let engine: Engine | null = null;
let scene: Scene | null = null;
let disposeScene: (() => void) | null = null;
let resizeListener: (() => void) | null = null;

onMounted(async () => {
  if (canvas.value) {
    engine = new Engine(canvas.value, true);
    const result = await createScene(engine, canvas.value);
    scene = result.scene;
    disposeScene = result.dispose;

    engine.runRenderLoop(() => {
      scene?.render();
    });

    resizeListener = () => {
      engine?.resize();
    };
    window.addEventListener('resize', resizeListener);
  }
});

onUnmounted(() => {
  if (resizeListener) {
    window.removeEventListener('resize', resizeListener);
  }
  if (engine) {
    engine.stopRenderLoop();
  }
  if (disposeScene) {
    disposeScene();
  }
  if (engine) {
    engine.dispose();
  }
});
</script>

<template>
  <main class="game-container">
    <canvas ref="canvas"></canvas>
  </main>
</template>

<style scoped>
.game-container {
  position: relative;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
}

canvas {
  width: 100%;
  height: 100dvh;
  display: block;
}
</style>
