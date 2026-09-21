export function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen.'))
    reader.onload = () => {
      const dataUrl = reader.result as string
      downscale(dataUrl, 256)
        .then(resolve)
        .catch(() => resolve(dataUrl))
    }
    reader.readAsDataURL(file)
  })
}

function downscale(dataUrl: string, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onerror = () => reject(new Error('Imagen inválida.'))
    image.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
      if (scale >= 1) {
        resolve(dataUrl)
        return
      }
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(dataUrl)
        return
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/png'))
    }
    image.src = dataUrl
  })
}