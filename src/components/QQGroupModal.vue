<script setup lang="ts">
defineProps<{
  show: boolean
}>()

const emit = defineEmits(['close'])
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div 
      v-if="show" 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" 
      @click="emit('close')"
    >
      <div 
        class="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl shadow-2xl border-4 border-black dark:border-gray-700 relative flex flex-col overflow-hidden p-6 text-center" 
        @click.stop
      >
        <button 
          class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-black text-white rounded-full hover:bg-[#e4007f] transition-colors z-20"
          @click="emit('close')"
        >
          <div class="i-carbon-close text-xl" />
        </button>

        <!-- Image -->
        <img src="/cana3.webp" class="w-32 h-32 mx-auto object-contain mb-4 rounded-lg hover:scale-105 transition-transform duration-300" alt="Cana" />

        <h2 class="text-2xl font-bold text-black dark:text-white mb-2" style="font-family: 'Noto Serif SC', serif;">
          【我推的ACN】
        </h2>
        
        <p class="text-gray-500 text-sm mb-1">QQ 群号</p>
        <div class="text-3xl font-black text-[#e4007f] mb-6 tracking-widest select-all cursor-text bg-gray-50 dark:bg-gray-800/50 py-2 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
          1022516640
        </div>
        
        <div class="space-y-4 text-gray-700 dark:text-gray-300 text-sm">
           <p>
             这是一个主打 <b>青春 · 恋爱 · 校园</b> 题材的<br>
             <b>ACN</b> (Animation · Comic · Novel) 交流群。
           </p>
           
           <div class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-left">
             <p class="font-bold text-[#e4007f] mb-2 text-center">在这里，你可以：</p>
             <ul class="list-disc list-inside space-y-1 opacity-80">
               <li>讨论《败犬女主》《租借女友》《春物》《我推的孩子》等热门/经典作品</li>
               <li>分享你的“我推”角色和 CP</li>
               <li>交流二次元美图与资讯</li>
               <li>寻找同好，不再孤单追番</li>
             </ul>
           </div>
           
           <p class="font-medium text-[#e4007f] pt-2">
             欢迎加入讨论，一起为爱发电！
           </p>
        </div>

      </div>
    </div>
  </Transition>
</template>
