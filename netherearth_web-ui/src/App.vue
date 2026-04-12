<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Engine } from '@babylonjs/core';
import { createScene } from './babylon/main';

const canvas = ref<HTMLCanvasElement | null>(null);

onMounted(async () => {
  if (canvas.value) {
    const engine = new Engine(canvas.value, true);
    const scene = await createScene(engine, canvas.value);

    engine.runRenderLoop(() => {
      scene.render();
    });

    window.addEventListener('resize', () => {
      engine.resize();
    });
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
