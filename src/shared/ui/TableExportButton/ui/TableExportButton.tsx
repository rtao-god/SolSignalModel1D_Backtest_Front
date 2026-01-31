import { useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { exportTable, type TableExportFormat } from '@/shared/lib/tableExport/tableExport'
import cls from './TableExportButton.module.scss'
import TableExportButtonProps from './types'
import { Btn } from '../../Btn'

/*
	Универсальная кнопка-иконка экспорта таблицы.

	- Можно повесить в правый верхний угол любой карточки с таблицей.
*/
export default function TableExportButton({
    className,
    columns,
    rows,
    fileBaseName,
    defaultFormat = 'pdf'
}: TableExportButtonProps) {
    const [open, setOpen] = useState(false)

    const handleToggle = () => {
        setOpen(prev => !prev)
    }

    const handleClose = () => {
        setOpen(false)
    }

    const handleExport = (format: TableExportFormat) => {
        // Нормализация значений до "прямоугольной" таблицы.
        const safeRows = (rows ?? []).map(row => row ?? [])

        exportTable({
            columns: columns ?? [],
            rows: safeRows,
            fileBaseName,
            format
        })

        setOpen(false)
    }

    return (
        <div className={classNames(cls.TableExportButton, {}, [className ?? ''])}>
            <Btn className={cls.trigger} onClick={handleToggle} aria-label='Скачать таблицу'>
                {/* Простейшая иконка "download" через SVG, чтобы не тянуть сторонние пакеты. */}
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
                <div
                    className={cls.menu}
                    // Простейшая закрывашка при уходе фокуса: можно улучшить позже за счёт глобального слушателя кликов.
                    onMouseLeave={handleClose}>
                    <Btn className={cls.menuItem} onClick={() => handleExport(defaultFormat)}>
                        Скачать как {defaultFormat.toUpperCase()}
                    </Btn>
                    <Btn className={cls.menuItem} onClick={() => handleExport(defaultFormat === 'pdf' ? 'csv' : 'pdf')}>
                        Скачать как {defaultFormat === 'pdf' ? 'CSV' : 'PDF'}
                    </Btn>
                </div>
            )}
        </div>
    )
}

