export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/checkin/index',
    'pages/message/index',
    'pages/record/index',
    'pages/mine/index',
    'pages/family/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#F8FAFF',
    navigationBarTitleText: '正畸管家',
    navigationBarTextStyle: 'black',
    backgroundColor: '#F8FAFF'
  },
  tabBar: {
    color: '#94A3B8',
    selectedColor: '#7C8CF6',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页'
      },
      {
        pagePath: 'pages/checkin/index',
        text: '打卡'
      },
      {
        pagePath: 'pages/message/index',
        text: '消息'
      },
      {
        pagePath: 'pages/record/index',
        text: '记录'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的'
      }
    ]
  }
})
