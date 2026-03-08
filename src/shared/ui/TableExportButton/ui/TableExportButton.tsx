import { useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { exportTable, type TableExportFormat } from '@/shared/lib/tableExport/tableExport'
import cls from './TableExportButton.module.scss'
import TableExportButtonProps from './types'
import { Btn } from '../../Btn'
import { useTranslation } from 'react-i18next'

export default function TableExportButton({
    className,
    columns,
    rows,
    fileBaseName,
    defaultFormat = 'pdf'
}: TableExportButtonProps) {
    const { t } = useTranslation('common')
    const [open, setOpen] = useState(false)
    const [isExporting, setIsExporting] = useState(false)

    const handleToggle = () => {
        if (isExporting) {
            return
        }
        setOpen(prev => !prev)
    }

    const handleClose = () => {
        if (isExporting) {
            return
        }
        setOpen(false)
    }

    const handleExport = async (format: TableExportFormat) => {
        if (isExporting) {
            return
        }

        setIsExporting(true)
        const safeRows = (rows ?? []).map(row => row ?? [])

        try {
            await exportTable({
                columns: columns ?? [],
                rows: safeRows,
                fileBaseName,
                format
            })
        } catch (error) {
            console.error('[table-export] Export failed.', error)
        } finally {
            setIsExporting(false)
            setOpen(false)
        }
    }

    const defaultFormatLabel = defaultFormat.toUpperCase()
    const secondaryFormat = defaultFormat === 'pdf' ? 'csv' : 'pdf'
    const secondaryFormatLabel = secondaryFormat.toUpperCase()

    return (
        <div className={classNames(cls.TableExportButton, {}, [className ?? ''])}>
            <Btn
                className={cls.trigger}
                onClick={handleToggle}
                aria-label={t('tableExport.ariaLabel', { defaultValue: 'Download table' })}
                disabled={isExporting}>
                <svg className={cls.icon} viewBox='0 0 24 24' aria-hidden='true'>
                    <path
                        d='M12 3.5a.75.75 0 0 1 .75.75v8.19l2.72-2.72a.75.75 0 0 1 1.06 1.06l-4.06 4.06a.75.75 0 0 1-1.06 0L7.35 10.78a.75.75 0 0 1 1.06-1.06l2.84 2.84V4.25A.75.75 0 0 1 12 3.5z'
                        fill='currentColor'
                    />
                    <path
                        d='M5.25 15.5a.75.75 0 0 1 .75.75v1.75c0 .69.56 1.25 1.25 1.25h9.5c.69 0 1.25-.56 1.25-1.25v-1.75a.75.75 0 0 1 1.5 0v1.75A2.75 2.75 0 0 1 16.75 20h-9.5A2.75 2.75 0 0 1 4.5 17.25v-1.75a.75.75 0 0 1 .75-.75z'
                        fill='currentColor'
                    />
                </svg>
            </Btn>

            {open && (
                <div className={cls.menu} onMouseLeave={handleClose}>
                    <Btn
                        className={cls.menuItem}
                        onClick={() => void handleExport(defaultFormat)}
                        disabled={isExporting}>
                        {isExporting ?
                            t('tableExport.loading', { defaultValue: 'Preparing file...' })
                        :   t('tableExport.downloadAs', {
                                format: defaultFormatLabel,
                                defaultValue: 'Download as {{format}}'
                            })
                        }
                    </Btn>
                    <Btn
                        className={cls.menuItem}
                        onClick={() => void handleExport(secondaryFormat)}
                        disabled={isExporting}>
                        {isExporting ?
                            t('tableExport.loading', { defaultValue: 'Preparing file...' })
                        :   t('tableExport.downloadAs', {
                                format: secondaryFormatLabel,
                                defaultValue: 'Download as {{format}}'
                            })
                        }
                    </Btn>
                </div>
            )}
        </div>
    )
}
