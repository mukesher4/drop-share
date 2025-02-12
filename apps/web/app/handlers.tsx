"use client"

interface FileObject {  
    name: string;
    url: string;
}
interface FileResponse {
    fileName: string;
    fileURL: string;
}

export const handleDisplay = async (setFiles: any, vault: string) => {
  try{
    const res = await fetch(`${URL}/files/${vault}`)
    const response = await res.json()
    response.forEach((res: FileResponse)=>{
      setFiles((prevFiles: any) => {
        const newFile: FileObject = {
          name: res.fileName,
          url: res.fileURL
          }
        return [...prevFiles, newFile]
      })
    })
    } catch(err) {
    console.error("File Retrival Error")
  }
}