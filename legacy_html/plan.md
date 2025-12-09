好的，这是一个专门为 AI Agent 设计的、严格的、分步骤的项目改造方案。AI Agent 可以遵循这些指令来完成 `itorr/anime-grid` 项目的改造。

项目名称： https://github.com/ywh555hhh/anime-role-grid

Token: okv7MOpIwVdDcXOL14T9INiDD7GLwyJOlhf5uXBz

---

### **项目指导方案：将 `itorr/anime-grid` 改造为“动画角色个人喜好表”**

**项目目标：** 将基于 Vue 3 的番剧展示项目 `itorr/anime-grid` 改造为一个用于搜索并展示动画角色的个人喜好表。

**核心技术栈：** Vue 3, Vite, TypeScript, UnoCSS

**数据源：** [Bangumi API](https://github.com/bangumi/api)

**最终交付物：** 一个修改完成、可部署为静态网站的项目代码库。

---

### **第一阶段：环境设置与 API 准备**

此阶段为准备工作，确保后续编码顺利进行。

**1.1. 项目初始化**
   - **指令：** Fork `itorr/anime-grid` 仓库到目标 GitHub 账户。
   - **指令：** 将 Fork 后的仓库克隆到本地开发环境。
   - **指令：** 在项目根目录执行 `npm install` 安装所有依赖。
   - **指令：** 执行 `npm run dev` 确保原始项目可以成功运行。

**1.2. Bangumi API 凭证与配置**
   - **说明：** Bangumi API 需要认证才能调用。以下凭证将作为占位符使用，实际操作时需替换为真实凭证。
   - **占位符-1 (访问令牌):** `BANGUMI_ACCESS_TOKEN`
     - 这是调用 API 的身份密钥。
   - **占位符-2 (用户代理):** `USER_GITHUB_USERNAME/character-grid (https://github.com/USER_GITHUB_USERNAME/character-grid)`
     - 这是 API 请求必须携带的 `User-Agent`，用于身份识别。请将 `USER_GITHUB_USERNAME` 替换为用户的 GitHub 用户名。
   - **指令：** 在项目根目录创建一个新文件 `.env`，用于存放 API 凭证。
     ``` name=.env
     VITE_BANGUMI_ACCESS_TOKEN="YOUR_REAL_BANGUMI_ACCESS_TOKEN"
     VITE_BANGUMI_USER_AGENT="username/character-grid (https://github.com/username/character-grid)"
     ```
   - **说明：** 提示用户需将 `.env` 文件中的占位符替换为他自己的真实信息。`.env` 文件已被 `.gitignore` 忽略，不会被提交到代码库。

---

### **第二阶段：核心代码修改**

此阶段是改造的核心，将逐步修改数据类型、API 请求逻辑和 UI 组件。

**2.1. 修改数据类型 (`src/types.ts`)**
   - **目标：** 定义与 Bangumi 角色 API 响应相匹配的 TypeScript 类型。
   - **指令：** 打开 `src/types.ts` 文件，删除或注释掉所有与番剧（Subject）相关的旧类型，然后添加以下新类型定义。

   ````typescript name=src/types.ts
   // bangumi-anime-grid character version
   
   // 从 POST /v0/search/characters 返回的数据类型
   export interface BgmCharacterSearchResultItem {
     id: number;
     name: string;
     relation: string;
     actors: {
       name: string;
     }[];
     images: {
       small: string;
       grid: string;
       large: string;
       medium: string;
     };
   }
   
   // 角色详情数据类型，用于展示在格子上
   export interface GridItemCharacter {
     id: number;
     name: string;
     image: string; // 我们将使用 large 尺寸的图片
   }
   ````

**2.2. 修改 API 请求逻辑 (`src/logic/search.ts`)**
   - **目标：** 将原来的番剧搜索逻辑替换为调用 Bangumi 的角色搜索 API。
   - **指令：** 完全重写 `src/logic/search.ts` 文件，使用以下新代码。此代码将执行以下操作：
     1. 从环境变量中读取 API 凭证。
     2. 使用 `POST /v0/search/characters` 端点进行角色搜索。
     3. 遵守 Bangumi API 的 `User-Agent` 和 `Authorization` Header 要求。

   ````typescript name=src/logic/search.ts
   import type { BgmCharacterSearchResultItem } from '~/types'
   
   // 从环境变量中获取敏感信息
   const accessToken = import.meta.env.VITE_BANGUMI_ACCESS_TOKEN
   const userAgent = import.meta.env.VITE_BANGUMI_USER_AGENT
   
   // 搜索函数
   export async function useBgmSearch(keyword: string) {
     if (!keyword)
       return []
   
     // 检查凭证是否存在
     if (!accessToken || !userAgent) {
       console.error('Bangumi Access Token or User Agent is not configured in .env file.')
       // 你可以在这里向用户显示一个错误提示
       return []
     }
   
     const res = await fetch('https://api.bgm.tv/v0/search/characters', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${accessToken}`,
         'User-Agent': userAgent,
       },
       body: JSON.stringify({
         keyword,
       }),
     })
   
     if (!res.ok) {
       console.error(`Failed to fetch from Bangumi API: ${res.statusText}`)
       return []
     }
   
     // API v0/search/characters 返回的是一个包含 data 字段的对象
     const result = await res.json()
     return (result.data || []) as BgmCharacterSearchResultItem[]
   }
   ````

**2.3. 更新搜索组件 (`src/components/Search.vue`)**
   - **目标：** 调整搜索组件以处理并展示角色搜索结果。
   - **指令：** 修改 `src/components/Search.vue`。主要改动点是将 `item.name_cn || item.name` 替换为 `item.name`，并将 `item.images?.medium` 替换为 `item.images?.grid` 或 `item.images?.small`，因为这是角色搜索结果中提供的图片。

   ````vue name=src/components/Search.vue
   <script setup lang="ts">
   import { useMagicKeys, whenever } from '@vueuse/core'
   import { useBgmSearch } from '~/logic/search'
   import type { BgmCharacterSearchResultItem } from '~/types'
   
   const emit = defineEmits(['add', 'close'])
   
   const input = ref<HTMLInputElement>()
   const keyword = ref('')
   const searchResult = shallowRef<BgmCharacterSearchResultItem[]>([])
   
   const { Escape } = useMagicKeys()
   whenever(Escape, () => emit('close'))
   
   async function handleSearch() {
     searchResult.value = await useBgmSearch(keyword.value)
   }
   
   function handleAdd(item: BgmCharacterSearchResultItem) {
     emit('add', {
       id: item.id,
       name: item.name,
       image: item.images.large, // 关键：将角色的大图URL传递给父组件
     })
     emit('close')
   }
   
   onMounted(() => {
     input.value?.focus()
   })
   </script>
   
   <template>
     <div p="4" class="flex flex-col gap-4">
       <div class="relative">
         <input
           ref="input"
           v-model="keyword"
           class="w-full !pr-10"
           placeholder="搜索角色..."
           type="text"
           @keydown.enter="handleSearch"
         >
         <div class="absolute right-3 top-1/2 -translate-y-1/2 text-xl">
           <div i-carbon-search class="cursor-pointer" @click="handleSearch" />
         </div>
       </div>
       <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
         <div
           v-for="item in searchResult"
           :key="item.id"
           class="flex flex-col gap-2 items-center cursor-pointer"
           @click="handleAdd(item)"
         >
           <img :src="item.images?.grid || item.images?.medium" class="aspect-[27/38] w-full object-cover rounded shadow-lg">
           <!-- 修改点：直接使用 item.name，因为角色没有 name_cn -->
           <p class="w-full text-center text-sm truncate" :title="item.name">
             {{ item.name }}
           </p>
         </div>
       </div>
     </div>
   </template>
   ````

**2.4. 调整主应用逻辑 (`src/App.vue`)**
   - **目标：** 确保主应用接收从 `Search.vue` 传递来的新角色数据结构并正确渲染。
   - **指令：** 修改 `src/App.vue` 中的 `handleAdd` 函数和 `Grid` 组件的绑定。

   ````vue name=src/App.vue
   <script setup lang="ts">
   import { list, name } from '~/logic/storage'
   import type { GridItemCharacter } from '~/types'
   
   const showSearch = ref(false)
   
   // 修改 handleAdd 函数以匹配新的数据结构
   function handleAdd(item: GridItemCharacter) {
     if (list.value.find(i => i.id === item.id))
       return
     list.value.push(item)
   }
   </script>
   
   <template>
     <Header v-model:name="name" @search="showSearch = true" />
     <!-- Grid 组件现在接收 GridItemCharacter[] 类型的列表 -->
     <Grid v-model:list="list" />
   
     <Transition name="fade">
       <div v-if="showSearch" class="fixed inset-0 z-100 backdrop-blur-xl" @click="showSearch = false" />
     </Transition>
     <Transition name="slide">
       <Search
         v-if="showSearch"
         class="fixed left-1/2 top-20 z-100 -translate-x-1/2 w-full max-w-4xl h-[calc(100%-10rem)] of-auto bg-white/80 dark:bg-black/80 rounded-lg shadow-2xl"
         @add="handleAdd"
         @close="showSearch = false"
       />
     </Transition>
   </template>
   ````

---

### **第三阶段：验证与完成**

1.  **指令：** 再次执行 `npm run dev` 启动本地开发服务器。
2.  **验证：**
    - 页面应能正常加载。
    - 点击搜索按钮，弹出的搜索框中输入一个角色名（如“Saber”，“蕾姆”）。
    - 搜索结果应显示角色的图片和名称。
    - 点击一个搜索结果，该角色的大图应被添加到底部的格子中。
    - 功能符合预期。
3.  **完成：** AI Agent 任务完成。项目已成功改造。后续用户可自行部署到 Cloudflare Pages, Vercel 等平台。

---