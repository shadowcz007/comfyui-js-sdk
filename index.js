export const getImage = async (serverAddress, filename, subfolder, folderType) => {
    const params = new URLSearchParams({ filename, subfolder, type: folderType });
    const response = await fetch(`https://${serverAddress}/view?${params.toString()}`);
    return await response.blob();
  };
  
  export const getHistory = async (serverAddress, promptId) => {
    const response = await fetch(`https://${serverAddress}/history/${promptId}`);
    return await response.json();
  };
  
  const handleWebSocket = (serverAddress, promptId, clientId) => {
    const outputImages = {};
    const ws = new WebSocket(`wss://${serverAddress}/ws?clientId=${clientId}`);
  
    return new Promise((resolve, reject) => {
      ws.onmessage = async event => {
        const message = JSON.parse(event.data);
        if (message.type === 'executing') {
          const data = message.data;
          console.log('#executing', data.node === null, data.prompt_id === promptId);
          if (data.node === null && data.prompt_id === promptId) {
            ws.close();
            const history = await getHistory(serverAddress, promptId);
            const promptHistory = history[promptId];
  
            for (const nodeId in promptHistory.outputs) {
              const nodeOutput = promptHistory.outputs[nodeId];
              const imagesOutput = [];
              if (nodeOutput.images) {
                for (const image of nodeOutput.images) {
                  const imageData = await getImage(serverAddress, image.filename, image.subfolder, image.type);
                  imagesOutput.push(imageData);
                }
              }
              outputImages[nodeId] = imagesOutput;
            }
            resolve(outputImages);
          }
        }
      };
  
      ws.onerror = error => {
        reject(error);
      };
    });
  };
  
  export const postWorkflow = async (serverAddress, workflowData, clientId) => {
    const response = await fetch(`https://${serverAddress}/mixlab/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(workflowData)
    });
  
    const result = await response.json();
  
    return handleWebSocket(serverAddress, result.prompt_id, clientId);
  };
  