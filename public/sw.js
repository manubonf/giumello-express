// self.addEventListener('push', (event) => {
//   const data = event.data?.json() ?? {}
//   const title = data.title ?? 'Navette'
//   const options = {
//     body: data.body ?? '',
//     icon: '/FlyLibell_Logotipo_Red.svg',
//     data: { url: data.url ?? '/' },
//   }
//   event.waitUntil(self.registration.showNotification(title, options))
// })

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const title = data.title ?? 'Navette'
  const options = {
    body: data.body ?? '',
    icon: '/FlyLibell_Logotipo_Red.svg',
    data: { url: data.url ?? '/' },
  }
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      title === 'Nuova proposta' && 'setAppBadge' in self.navigator
        ? self.navigator.setAppBadge()
        : Promise.resolve(),
    ])
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(clients.openWindow(url))
})



