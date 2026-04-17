<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { Engine, Scene } from '@babylonjs/core';
import { createScene } from './babylon/main';

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
  <header>
    <div class="wrapper">
      <h1>hello world</h1>
    </div>
  </header>
  <main class="game-container">
    <canvas ref="canvas"></canvas>
  </main>
</template>

<style scoped>
header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

.game-container {
  position: relative;
  width: 100%;
}

canvas {
  width: 100%;
  height: 500px;
  border: 1px solid black;
  display: block;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
