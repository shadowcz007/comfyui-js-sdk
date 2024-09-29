export const getImage = async (
  protocol = 's',
  serverAddress,
  filename,
  subfolder,
  folderType,
  isBlob = false
) => {
  const params = new URLSearchParams({ filename, subfolder, type: folderType })
  let url = `http${protocol}://${serverAddress}/view?${params.toString()}`
  if (!isBlob) return url
  const response = await fetch(url)
  return await response.blob()
}

export const getHistory = async (
  protocol = 's',
  serverAddress,
  promptId,
  isBlob = false
) => {
  const response = await fetch(
    `http${protocol}://${serverAddress}/history/${promptId}`
  )
  let history = await response.json()

  const promptHistory = history[promptId]
  let outputImages = {}
  for (const nodeId in promptHistory.outputs) {
    const nodeOutput = promptHistory.outputs[nodeId]
    const imagesOutput = []
    if (nodeOutput.images) {
      for (const image of nodeOutput.images) {
        const imageData = await getImage(
          protocol,
          serverAddress,
          image.filename,
          image.subfolder,
          image.type,
          isBlob
        )
        imagesOutput.push(imageData)
      }
    }
    outputImages[nodeId] = imagesOutput
  }
  return outputImages
}

const handleWebSocket = (
  protocol = 's',
  serverAddress,
  promptId,
  clientId,
  isBlob = false
) => {
  const ws = new WebSocket(
    `ws${protocol}://${serverAddress}/ws?clientId=${clientId}`
  )

  return new Promise((resolve, reject) => {
    ws.onmessage = async event => {
      const message = JSON.parse(event.data)
      if (message.type === 'executing') {
        const data = message.data
        console.log('#executing', data.node, data.prompt_id, promptId)
        if (data.node === null && data.prompt_id === promptId) {
          ws.close()
          const outputImages = await getHistory(
            protocol,
            serverAddress,
            promptId
          )

          resolve(outputImages)
        }
      }
    }

    ws.onerror = error => {
      reject(error)
    }
  })
}

export const postWorkflow = async (
  protocol = 's',
  serverAddress,
  workflowData,
  clientId,
  isBlob = false,
  callback
) => {
  const response = await fetch(
    `http${protocol}://${serverAddress}/mixlab/prompt`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(workflowData)
    }
  )

  const result = await response.json()
  if (callback) callback(result.prompt_id)
  return handleWebSocket(
    protocol,
    serverAddress,
    result.prompt_id,
    clientId,
    isBlob
  )
}
