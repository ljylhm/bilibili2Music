"use client"

import { useState, useCallback } from "react"

export interface ConversionStep {
  id: string
  name: string
  status: "pending" | "in-progress" | "completed" | "error"
  progress?: number
  message?: string
}

export interface ConversionState {
  isConverting: boolean
  steps: ConversionStep[]
  currentStep: string
  overallProgress: number
  downloadUrl?: string
  fileName?: string
  fileSize?: number
  expiresAt?: string
  error?: string
}

const defaultSteps: ConversionStep[] = [
  {
    id: "validate",
    name: "验证视频链接",
    status: "pending",
    message: "检查链接格式和可访问性",
  },
  {
    id: "download",
    name: "下载视频",
    status: "pending",
    message: "从Bilibili服务器下载视频文件",
  },
  {
    id: "convert",
    name: "转换为MP3",
    status: "pending",
    message: "提取音频并转换为MP3格式",
  },
  {
    id: "finalize",
    name: "准备下载",
    status: "pending",
    message: "生成下载链接并清理临时文件",
  },
]

export function useConversion() {
  const [state, setState] = useState<ConversionState>({
    isConverting: false,
    steps: defaultSteps,
    currentStep: "",
    overallProgress: 0,
  })

  const updateStep = useCallback((stepId: string, updates: Partial<ConversionStep>) => {
    setState((prev) => ({
      ...prev,
      steps: prev.steps.map((step) => (step.id === stepId ? { ...step, ...updates } : step)),
    }))
  }, [])

  const setCurrentStep = useCallback((stepId: string) => {
    setState((prev) => ({ ...prev, currentStep: stepId }))
  }, [])

  const setOverallProgress = useCallback((progress: number) => {
    setState((prev) => ({ ...prev, overallProgress: progress }))
  }, [])

  const startConversion = useCallback(
    async (videoUrl: string) => {
      setState((prev) => ({
        ...prev,
        isConverting: true,
        error: undefined,
        downloadUrl: undefined,
        fileName: undefined,
        fileSize: undefined,
        expiresAt: undefined,
        steps: defaultSteps.map((step) => ({ ...step, status: "pending" as const })),
        overallProgress: 0,
      }))

      try {
        // 步骤1: 验证链接
        setCurrentStep("validate")
        updateStep("validate", { status: "in-progress", progress: 0 })
        setOverallProgress(10)

        await new Promise((resolve) => setTimeout(resolve, 500)) // 模拟验证时间

        updateStep("validate", { status: "completed", progress: 100 })
        setOverallProgress(25)

        // 步骤2-4: 调用API进行实际转换
        setCurrentStep("download")
        updateStep("download", { status: "in-progress", progress: 0 })

        console.log("[v0] 开始调用转换API")

        const response = await fetch("/api/convert", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: videoUrl }),
        })

        console.log("[v0] API响应状态:", response.status, response.statusText)

        // 检查响应的Content-Type
        const contentType = response.headers.get("content-type")
        console.log("[v0] 响应Content-Type:", contentType)

        if (!contentType || !contentType.includes("application/json")) {
          // 如果不是JSON响应，读取文本内容用于调试
          const textResponse = await response.text()
          console.error("[v0] 非JSON响应:", textResponse)
          throw new Error("服务器返回了非JSON格式的响应，请检查服务器状态")
        }

        let data
        try {
          data = await response.json()
        } catch (jsonError) {
          console.error("[v0] JSON解析失败:", jsonError)
          throw new Error("服务器响应格式错误，无法解析JSON数据")
        }

        console.log("[v0] 解析的响应数据:", data)

        if (!response.ok) {
          throw new Error(data.error || `服务器错误 (${response.status})`)
        }

        if (!data.success) {
          throw new Error(data.error || "转换失败")
        }

        // 模拟下载进度
        updateStep("download", { status: "in-progress", progress: 30 })
        setOverallProgress(40)
        await new Promise((resolve) => setTimeout(resolve, 1000))

        updateStep("download", { status: "in-progress", progress: 80 })
        setOverallProgress(60)
        await new Promise((resolve) => setTimeout(resolve, 1000))

        updateStep("download", { status: "completed", progress: 100 })
        setOverallProgress(75)

        // 步骤3: 转换
        setCurrentStep("convert")
        updateStep("convert", { status: "in-progress", progress: 0 })

        await new Promise((resolve) => setTimeout(resolve, 500))
        updateStep("convert", { status: "in-progress", progress: 50 })
        setOverallProgress(85)

        await new Promise((resolve) => setTimeout(resolve, 500))
        updateStep("convert", { status: "completed", progress: 100 })
        setOverallProgress(95)

        // 步骤4: 完成
        setCurrentStep("finalize")
        updateStep("finalize", { status: "in-progress", progress: 0 })

        updateStep("finalize", { status: "completed", progress: 100 })
        setOverallProgress(100)

        console.log("[v0] 转换完成，设置结果数据")

        setState((prev) => ({
          ...prev,
          isConverting: false,
          downloadUrl: data.downloadUrl,
          fileName: data.filename,
          fileSize: data.fileSize,
          expiresAt: data.expiresAt,
        }))
      } catch (error) {
        console.error("[v0] 转换过程中出现错误:", error)

        const errorMessage = error instanceof Error ? error.message : "转换过程中出现错误"

        setState((prev) => ({
          ...prev,
          isConverting: false,
          error: errorMessage,
          steps: prev.steps.map((step) =>
            step.status === "in-progress" ? { ...step, status: "error" as const } : step,
          ),
        }))
      }
    },
    [updateStep, setCurrentStep, setOverallProgress],
  )

  const resetConversion = useCallback(() => {
    setState({
      isConverting: false,
      steps: defaultSteps,
      currentStep: "",
      overallProgress: 0,
    })
  }, [])

  return {
    ...state,
    startConversion,
    resetConversion,
  }
}
