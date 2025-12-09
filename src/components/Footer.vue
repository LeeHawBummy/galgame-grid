<script setup lang="ts">
// Footer component with credits
</script>

<template>
  <footer 
    class="mt-16 pb-12 text-center text-gray-600"
    style="font-family: 'Noto Serif SC', serif;"
  >
    
    <!-- Credits -->
    <div class="space-y-4 text-sm">
      <p class="tracking-wide flex items-center justify-center gap-2">
        <span class="i-carbon-data-base text-gray-400" />
        <span>数据来源</span>
        <a href="https://bgm.tv" target="_blank" class="font-bold text-[#e4007f] hover:text-[#c0006b] transition-colors mx-1 flex items-center gap-1">
          Bangumi 番组计划
          <span class="i-carbon-favorite-filled text-xs" />
        </a>
        <span class="text-gray-400">·</span>
        <a href="https://vndb.org" target="_blank" class="font-bold text-[#103050] hover:text-[#0a1f30] transition-colors mx-1 flex items-center gap-1">
          VNDB
          <span class="i-carbon-favorite-filled text-xs" />
        </a>
      </p>
      
      <div class="flex items-center justify-center gap-2 text-xs opacity-80">
        <span class="i-carbon-idea text-gray-400" />
        <span>修改自</span>
        <a href="https://github.com/ywh555hhh/anime-role-grid" target="_blank" class="hover:text-[#e4007f] transition-colors border-b border-transparent hover:border-[#e4007f] flex items-center gap-1">
          ywh555hhh/anime-role-grid
          <span class="i-carbon-launch text-[10px]" />
        </a>
      </div>

      <!-- Artistic Note -->
      <p class="italic opacity-60 text-xs mt-8 tracking-widest flex items-center justify-center gap-2">
        <span class="i-carbon-quotes text-gray-300" />
        Create, Share, and Discover your Galgame Taste
        <span class="i-carbon-quotes text-gray-300 transform rotate-180" />
      </p>

      <!-- Disclaimer -->
      <p class="text-[10px] opacity-40 mt-2 tracking-wider flex items-center justify-center gap-1">
        <span class="i-carbon-information" />
        仅供个人娱乐使用 · 禁止用于任何商业用途
      </p>
    </div>
  </footer>
</template>
