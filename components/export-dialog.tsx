"use client"

import { useState } from "react"
import { Download, FileText, FileSpreadsheet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { BusinessResult } from "@/app/types"

interface ExportDialogProps {
  businesses: BusinessResult[]
  disabled?: boolean
}

interface ExportField {
  key: keyof BusinessResult
  label: string
  checked: boolean
}

export function ExportDialog({ businesses, disabled = false }: ExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<"csv" | "json" | "txt">("csv")
  const [onlyWithoutWebsite, setOnlyWithoutWebsite] = useState(false)
  const [fields, setFields] = useState<ExportField[]>([
    { key: "name", label: "Business Name", checked: true },
    { key: "category", label: "Category", checked: true },
    { key: "phone", label: "Phone", checked: true },
    { key: "email", label: "Email", checked: true },
    { key: "website", label: "Website", checked: true },
    { key: "address", label: "Address", checked: true },
  ])

  const handleFieldToggle = (fieldKey: keyof BusinessResult) => {
    setFields((prev) => prev.map((field) => (field.key === fieldKey ? { ...field, checked: !field.checked } : field)))
  }

  const selectAllFields = () => {
    setFields((prev) => prev.map((field) => ({ ...field, checked: true })))
  }

  const deselectAllFields = () => {
    setFields((prev) => prev.map((field) => ({ ...field, checked: false })))
  }

  const getSelectedFields = () => fields.filter((field) => field.checked)

  const getFilteredBusinesses = () => {
    if (onlyWithoutWebsite) {
      return businesses.filter((business) => !business.website || business.website.trim() === "")
    }
    return businesses
  }

  const exportToCSV = () => {
    const selectedFields = getSelectedFields()
    const filteredBusinesses = getFilteredBusinesses()
    if (selectedFields.length === 0 || filteredBusinesses.length === 0) return

    const headers = selectedFields.map((field) => field.label).join(",")
    const rows = filteredBusinesses.map((business) =>
      selectedFields
        .map((field) => {
          const value = business[field.key] || ""
          const escaped = value.toString().replace(/"/g, '""')
          return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped
        })
        .join(","),
    )

    const csvContent = [headers, ...rows].join("\n")
    const filename = onlyWithoutWebsite ? "businesses-without-website.csv" : "business-data.csv"
    downloadFile(csvContent, filename, "text/csv")
  }

  const exportToJSON = () => {
    const selectedFields = getSelectedFields()
    const filteredBusinesses = getFilteredBusinesses()
    if (selectedFields.length === 0 || filteredBusinesses.length === 0) return

    const exportData = filteredBusinesses.map((business) => {
      const filteredBusiness: Partial<BusinessResult> = {}
      selectedFields.forEach((field) => {
        filteredBusiness[field.key] = business[field.key]
      })
      return filteredBusiness
    })

    const jsonContent = JSON.stringify(exportData, null, 2)
    const filename = onlyWithoutWebsite ? "businesses-without-website.json" : "business-data.json"
    downloadFile(jsonContent, filename, "application/json")
  }

  const exportToTXT = () => {
    const selectedFields = getSelectedFields()
    const filteredBusinesses = getFilteredBusinesses()
    if (selectedFields.length === 0 || filteredBusinesses.length === 0) return

    let txtContent = ""

    filteredBusinesses.forEach((business, index) => {
      txtContent += `Business ${index + 1}:\n`
      txtContent += "=" + "=".repeat(20) + "\n"

      selectedFields.forEach((field) => {
        const value = business[field.key] || "N/A"
        txtContent += `${field.label}: ${value}\n`
      })

      txtContent += "\n"
    })

    const filename = onlyWithoutWebsite ? "businesses-without-website.txt" : "business-data.txt"
    downloadFile(txtContent, filename, "text/plain")
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExport = () => {
    const selectedFields = getSelectedFields()
    const filteredBusinesses = getFilteredBusinesses()

    if (selectedFields.length === 0) {
      alert("Please select at least one field to export.")
      return
    }

    if (filteredBusinesses.length === 0) {
      alert("No businesses match your filter criteria.")
      return
    }

    switch (exportFormat) {
      case "csv":
        exportToCSV()
        break
      case "json":
        exportToJSON()
        break
      case "txt":
        exportToTXT()
        break
    }

    setOpen(false)
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case "csv":
        return <FileSpreadsheet className="h-4 w-4" strokeWidth={1} />
      case "json":
        return <FileText className="h-4 w-4" strokeWidth={1} />
      case "txt":
        return <FileText className="h-4 w-4" strokeWidth={1} />
      default:
        return <Download className="h-4 w-4" strokeWidth={1} />
    }
  }

  const selectedFieldsCount = getSelectedFields().length
  const filteredBusinesses = getFilteredBusinesses()
  const businessesWithoutWebsite = businesses.filter((b) => !b.website || b.website.trim() === "").length

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled || businesses.length === 0} className="button-outline" size="sm">
          <Download className="h-4 w-4 mr-2" strokeWidth={1} />
          <span className="text-xs">Export</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md w-[95vw] max-w-[95vw] sm:w-full border border-border/40 rounded-3xl bg-background max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-medium">Export Business Data</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            Choose fields and format. {filteredBusinesses.length} of {businesses.length} businesses will be exported.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-base font-medium">Filter Options</Label>
            <div className="flex items-center space-x-2 p-3 border border-border/40 rounded-2xl">
              <Checkbox id="no-website-filter" checked={onlyWithoutWebsite} onCheckedChange={setOnlyWithoutWebsite} />
              <Label htmlFor="no-website-filter" className="text-sm cursor-pointer flex-1">
                Only businesses without website ({businessesWithoutWebsite})
              </Label>
            </div>
          </div>

          <div className="h-px bg-border/30"></div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Select Fields</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllFields}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={deselectAllFields}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fields.map((field) => {
                let count = 0
                if (field.key === "phone") {
                  count = filteredBusinesses.filter((b) => b.phone && b.phone.trim() !== "").length
                } else if (field.key === "email") {
                  count = filteredBusinesses.filter((b) => b.email && b.email.trim() !== "").length
                } else if (field.key === "website") {
                  count = filteredBusinesses.filter((b) => b.website && b.website.trim() !== "").length
                }

                return (
                  <div key={field.key} className="flex items-center space-x-2 p-2 border border-border/40 rounded-xl">
                    <Checkbox
                      id={field.key}
                      checked={field.checked}
                      onCheckedChange={() => handleFieldToggle(field.key)}
                    />
                    <Label htmlFor={field.key} className="text-sm cursor-pointer flex-1">
                      {field.label}
                      {(field.key === "phone" || field.key === "email" || field.key === "website") && (
                        <span className="text-xs text-muted-foreground ml-1">({count})</span>
                      )}
                    </Label>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-medium">Export Format</Label>
            <RadioGroup value={exportFormat} onValueChange={(value) => setExportFormat(value as any)}>
              <div className="flex items-center space-x-2 p-2 border border-border/40 rounded-xl">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer flex-1 text-sm">
                  <FileSpreadsheet className="h-4 w-4" strokeWidth={1} />
                  CSV
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-2 border border-border/40 rounded-xl">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json" className="flex items-center gap-2 cursor-pointer flex-1 text-sm">
                  <FileText className="h-4 w-4" strokeWidth={1} />
                  JSON
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-2 border border-border/40 rounded-xl">
                <RadioGroupItem value="txt" id="txt" />
                <Label htmlFor="txt" className="flex items-center gap-2 cursor-pointer flex-1 text-sm">
                  <FileText className="h-4 w-4" strokeWidth={1} />
                  TXT
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button onClick={() => setOpen(false)} className="button-outline w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={selectedFieldsCount === 0 || filteredBusinesses.length === 0}
            className="button-filled w-full sm:w-auto"
          >
            {getFormatIcon(exportFormat)}
            <span className="ml-2 text-sm">
              Export {filteredBusinesses.length} {exportFormat.toUpperCase()}
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
