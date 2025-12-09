export type TemplateCategory = 'character' | 'work' | 'relation' | 'fun' | 'nsfw' | 'galgame'

export interface Template {
    id: string
    name: string
    category: TemplateCategory
    label?: string // Secondary Label (e.g. "Anime", "Manga", "Attribute")
    cols: number
    items: string[]
    defaultTitle?: string
    hot?: boolean
}

export const TEMPLATES: Template[] = [
    {
        id: 'classic',
        name: '基础 (4x3)',
        category: 'character',
        label: '基础',
        cols: 4,
        defaultTitle: '我的生涯Galgame评选',
        hot: true,
        items: [
            '最佳游戏', '最佳剧情', '最佳画面', '最佳音乐', 
            '最佳人设', '最佳演出', '最纯爱', '最工口', 
            '最佳品牌', '最爱角色', '最佳声优', '最粪游戏', 
        ]
    },
    {
        id: 'extended',
        name: '扩展 (5x6)',
        category: 'character',
        label: '基础',
        cols: 5,
        defaultTitle: '我的生涯Galgame评选',
        items: [
            '最佳游戏', '最粪游戏', '最佳剧情', '最佳画面', '最佳音乐',
            '最佳人设', '最佳演出', '最佳系统', '最纯爱', '最工口',
            '最催泪', '最致郁', '最燃', '最萌', '最电波',
            '最佳影片', '最佳系列作', '最佳重制', '最佳汉化', '最佳结局',
            '最佳品牌', '最佳角色', '最佳男主', '最佳配角', '最佳声优',
            '入坑作', '最小众', '最想安利', '最被低估', '最被高估'
        ]
    }
]
