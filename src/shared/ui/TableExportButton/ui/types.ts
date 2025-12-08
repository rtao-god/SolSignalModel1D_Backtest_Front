import { TableExportFormat } from "@/shared/lib/tableExport/tableExport"

export default interface TableExportButtonProps {
    className?: string
    columns: string[]
    rows: Array<Array<string | number | boolean | null | undefined>>
    fileBaseName: string
    // По дефолту — pdf, но можно переопределить при переиспользовании.
    defaultFormat?: TableExportFormat
}