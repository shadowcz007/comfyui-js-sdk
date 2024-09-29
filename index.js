export const getImage = async (
  protocol = 's',
  serverAddress,
  filename,
  subfolder,
  folderType
) => {
  const params = new URLSearchParams({ filename, subfolder, type: folderType })
  const response = await fetch(
    `http${protocol}://${serverAddress}/view?${params.toString()}`
  )
  return await response.blob()
}

export const getHistory = async (protocol = 's', serverAddress, promptId) => {
  const response = await fetch(
    `http${protocol}://${serverAddress}/history/${promptId}`
  )
  return await response.json()
}

const handleWebSocket = (protocol = 's', serverAddress, promptId, clientId) => {
  const outputImages = {}
  const ws = new WebSocket(
    `ws${protocol}://${serverAddress}/ws?clientId=${clientId}`
  )

  return new Promise((resolve, reject) => {
    ws.onmessage = async event => {
      const message = JSON.parse(event.data)
      if (message.type === 'executing') {
        const data = message.data
        console.log(
          '#executing',
          data.node === null,
          data.prompt_id === promptId
        )
        if (data.node === null && data.prompt_id === promptId) {
          ws.close()
          const history = await getHistory(protocol, serverAddress, promptId)
          const promptHistory = history[promptId]

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
                  image.type
                )
                imagesOutput.push(imageData)
              }
            }
            outputImages[nodeId] = imagesOutput
          }
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
  clientId
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

  return handleWebSocket(protocol, serverAddress, result.prompt_id, clientId)
}
