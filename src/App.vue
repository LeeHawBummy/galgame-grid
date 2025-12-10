<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import Header from '~/components/Header.vue'
import Grid from '~/components/Grid.vue'
import Search from '~/components/Search.vue'
import Footer from '~/components/Footer.vue'
import GuideModal from '~/components/GuideModal.vue'
import FirstTimeGuide from '~/components/FirstTimeGuide.vue'
import TrendingGuideModal from '~/components/TrendingGuideModal.vue'
import { list, name, currentTemplateId } from '~/logic/storage'
import { TEMPLATES } from '~/logic/templates'
import type { GridItemCharacter } from '~/types'
import { exportGridAsImage } from '~/logic/export'

const showSearch = ref(false)
const showShareModal = ref(false)
const showGuideModal = ref(false)
const showFirstTimeGuide = ref(false)
const showTrendingGuide = ref(false)
const shouldShowTrendingAfterGuide = ref(false)

// Check for first time visit (Daily) - DISABLED
// if (typeof window !== 'undefined') {
//   const today = new Date().toDateString()
//   const lastShownDate = localStorage.getItem('lastGuideDate')

//   if (lastShownDate !== today) {
//     showFirstTimeGuide.value = true
//     shouldShowTrendingAfterGuide.value = true
//     localStorage.setItem('lastGuideDate', today)
//   }
// }

// Watch for FirstTimeGuide close to show TrendingGuide (only if auto-triggered)
watch(showFirstTimeGuide, (newVal, oldVal) => {
  if (oldVal === true && newVal === false) {
    if (shouldShowTrendingAfterGuide.value) {
      // Small delay to make it feel natural
      setTimeout(() => {
        showTrendingGuide.value = true
        shouldShowTrendingAfterGuide.value = false // Reset
      }, 300)
    }
  }
})

const currentSlotIndex = ref<number | null>(null)

const showTemplateModal = ref(false)



async function handleTrendingSelect(payload: { id: string, title: string }) {
  currentTemplateId.value = payload.id
  await nextTick()
  name.value = payload.title
  showTrendingGuide.value = false
}

function handleOpenGallery() {
  showTrendingGuide.value = false
  showTemplateModal.value = true
}

const currentTemplate = computed(() => 
  TEMPLATES.find(t => t.id === currentTemplateId.value) || TEMPLATES[0]!
)

// Auto-reset custom title when template changes to show new default
watch(currentTemplate, () => {
  name.value = ''
})

function handleSelectSlot(index: number) {
  currentSlotIndex.value = index
  showSearch.value = true
}

function handleAdd(character: GridItemCharacter) {
  const index = currentSlotIndex.value
  if (index === null) return
  
  // Create a shallow copy of the list to trigger the setter
  const newList = [...list.value]
  if (!newList[index]) return

  // Update the character in the selected slot
  newList[index] = {
    ...newList[index],
    character
  }
  
  // Trigger the computed setter in storage.ts
  list.value = newList
  
  // Close search
  showSearch.value = false
  currentSlotIndex.value = null
  currentSlotIndex.value = null
}

function handleClear() {
  const index = currentSlotIndex.value
  if (index === null) return
  
  // Create a shallow copy
  const newList = [...list.value]
  if (!newList[index]) return

  // Clear the character
  const item = newList[index]
  if (item.character) {
    newList[index] = {
      ...item,
      character: undefined
    }
  }
  
  list.value = newList
  showSearch.value = false
  currentSlotIndex.value = null
}

const saving = ref(false)

const imageLoadError = ref(false)
const generatedImage = ref('')
const canShare = ref(false)

// Check share support
if (typeof navigator !== 'undefined' && 'share' in navigator) {
  canShare.value = true
}

async function handleShare() {
  if (!generatedImage.value) {
    showShareModal.value = false
    return
  }

  // If native share is supported, try it
  if (canShare.value) {
    try {
      const blob = await (await fetch(generatedImage.value)).blob()
      const file = new File([blob], 'anime-grid.png', { type: 'image/png' })
      
      if ('canShare' in navigator && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: '我的二次元成分表',
          text: '快来看看我的二次元成分表吧！'
        })
        return
      }
    } catch (e) {
      console.error('Share failed:', e)
      // Fallback to just closing modal if share fails/cancelled
    }
  }
  
  showShareModal.value = false
}

async function handleSave() {
  if (saving.value) return
  saving.value = true
  
  try {
    // Collect data (Fire and forget, non-blocking)
    fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: currentTemplateId.value,
        customTitle: name.value,
        items: list.value
      })
    }).catch(err => {
      // Slient fail for analytics
      console.warn('Analytics failed:', err)
    })

    // Give UI a moment to show loading state
    await new Promise(resolve => setTimeout(resolve, 100))

    generatedImage.value = await exportGridAsImage(list.value, currentTemplateId.value, name.value, 'anime-grid')
    showShareModal.value = true
  } catch (error: any) {
    console.error('Export failed:', error)
    let msg = error.message || error
    if (Object.prototype.toString.call(error) === '[object Event]' && error.type === 'error') {
      msg = '资源加载失败 (可能是网络问题或图片跨域)'
    }
    alert(`图片生成失败: ${msg}`)
  } finally {
    saving.value = false
  }
}

</script>

<template>
  <div class="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans pb-20">
    <Header />
    
    <div class="container mx-auto flex flex-col items-center gap-6 px-4 max-w-full">
      <!-- Live Interactive Grid (Responsive, Direct URLs) -->
      <Grid 
        id="grid-capture-target"
        :list="list" 
        :cols="currentTemplate.cols"
        :title="currentTemplate.name"
        :default-title="currentTemplate.defaultTitle"
        v-model:customTitle="name"
        @select-slot="handleSelectSlot"
      />

      <div class="flex flex-col items-center gap-4">
        <button 
          class="px-10 py-3 bg-[#e4007f] text-white rounded-full text-lg font-bold hover:bg-[#c0006b] transition-all flex items-center gap-3 shadow-lg hover:shadow-xl hover:shadow-pink-500/30 transform hover:-translate-y-1"
          :disabled="saving"
          @click="handleSave"
        >
          <div v-if="saving" class="i-carbon-circle-dash animate-spin text-xl" />
          <div v-else class="i-carbon-image text-xl" />
          <span>{{ saving ? '生成中...' : '保存高清图片' }}</span>
        </button>


        <!-- Guide & Help Buttons (Temporarily Hidden) -->
        <!-- <div class="flex flex-col gap-2 mt-1">
            <button
              @click="showGuideModal = true"
              class="text-xs font-bold text-gray-600 hover:text-[#e4007f] flex items-center gap-1.5 transition-colors group"
            >
              <div class="p-1 rounded bg-gray-100 group-hover:bg-pink-50 transition-colors">
                  <div class="i-carbon-help text-sm" />
              </div>
              <span>食用指南 & 常见问题</span>
            </button>

            <button
              @click="handleManualGuideOpen"
              class="text-xs font-bold text-gray-600 hover:text-[#e4007f] flex items-center gap-1.5 transition-colors group"
            >
              <div class="p-1 rounded bg-gray-100 group-hover:bg-pink-50 transition-colors">
                  <div class="i-carbon-bullhorn text-sm" />
              </div>
              <span>查看更新 & 加入组织</span>
            </button>
        </div> -->

        <!-- Template Switcher (Simplified) -->
        <div class="flex items-center gap-2">
          <img src="/logo.png" class="w-5 h-5 object-contain" />
          <label class="text-sm text-black font-bold">当前模板:</label>
          <select
            v-model="currentTemplateId"
            class="flex items-center justify-center gap-2 bg-white border-2 border-black px-4 py-1 rounded-md text-sm font-bold min-w-[160px] focus:outline-none focus:border-[#e4007f]"
          >
            <option v-for="template in TEMPLATES" :key="template.id" :value="template.id">
              {{ template.name }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <Footer />

    <!-- Modals -->
    <FirstTimeGuide :show="showFirstTimeGuide" @close="showFirstTimeGuide = false" />
    <TrendingGuideModal 
      :show="showTrendingGuide" 
      @close="showTrendingGuide = false"
      @select="handleTrendingSelect"
      @open-gallery="handleOpenGallery"
    />
    <GuideModal :show="showGuideModal" @close="showGuideModal = false" />

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div 
        v-if="showSearch" 
        class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" 
        @click="showSearch = false" 
      />
    </Transition>

    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-y-10 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-10 opacity-0"
    >
      <Search
        v-if="showSearch"
        class="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-5xl h-[80vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800"
        @add="handleAdd"
        @clear="handleClear"
        @close="showSearch = false"
      />
    </Transition>

    <!-- Success/Share Modal -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div 
        v-if="showShareModal" 
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" 
        @click="showShareModal = false"
      >
        <div 
          class="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full transform transition-all border-2 border-[#e4007f]" 
          @click.stop
        >
          <div class="w-full mb-4 flex items-center justify-center">
            
            <img 
              v-if="generatedImage"
              :src="generatedImage" 
              class="w-full h-auto max-h-[50vh] object-contain rounded-lg shadow-sm border border-gray-100" 
              alt="Generated Grid"
            />
            <div v-else class="w-32 h-32 mx-auto animate-bounce-low">
              <img 
                v-if="!imageLoadError"
                src="/cana.png" 
                class="w-full h-full object-contain" 
                alt="Success"
                style="will-change: transform;"
                @error="imageLoadError = true"
              />
              <div v-else class="text-6xl">🎉</div>
            </div>
          </div>
          <h3 class="text-2xl font-bold mb-2 text-gray-900" style="font-family: 'Noto Serif SC', serif;">评选表生成成功！</h3>
          <p class="text-gray-600 mb-8 font-medium">
            已尝试保存到相册。<br/>
            <span class="text-sm text-gray-500">如果未自动保存，请长按上方图片手动保存哦~</span>
          </p>
          
          <div class="flex flex-col gap-3">
            <button 
              @click="handleShare" 
              class="w-full px-6 py-3 bg-[#e4007f] text-white rounded-xl font-bold hover:bg-[#c0006b] transition-colors shadow-lg hover:shadow-pink-500/30 flex items-center justify-center gap-2"
            >
              <div v-if="canShare" i-carbon-share />
              <span>{{ canShare ? '调用系统分享' : '好的，我去分享' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
