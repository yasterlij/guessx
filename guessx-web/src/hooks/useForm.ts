import { useCallback, useMemo, useState } from "react"
import type { z } from "zod"

type ZodSchema = z.ZodType<any, any>

type FormState<T> = {
  values: T
  errors: Partial<Record<keyof T, string>>
  touched: Partial<Record<keyof T, boolean>>
  isSubmitting: boolean
  isValid: boolean
}

export function useForm<T extends Record<string, any>>(
  schema: ZodSchema,
  initialValues: T,
) {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validate = useCallback(
    (data: T): Partial<Record<keyof T, string>> => {
      const result = schema.safeParse(data)
      if (result.success) return {}
      const fieldErrors: Partial<Record<keyof T, string>> = {}
      for (const issue of result.error.issues) {
        const key = (issue.path[0] as keyof T) ?? "_form"
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      }
      return fieldErrors
    },
    [schema],
  )

  const isValid = useMemo(() => {
    const result = schema.safeParse(values)
    return result.success
  }, [schema, values])

  const handleChange = useCallback(
    (field: keyof T, value: any) => {
      setValues((prev) => {
        const next = { ...prev, [field]: value }
        if (touched[field]) {
          const fieldErrors = validate(next)
          setErrors(fieldErrors)
        }
        return next
      })
    },
    [touched, validate],
  )

  const handleBlur = useCallback(
    (field: keyof T) => {
      setTouched((prev) => ({ ...prev, [field]: true }))
      const fieldErrors = validate(values)
      setErrors(fieldErrors)
    },
    [validate, values],
  )

  const setField = useCallback(
    (field: keyof T, value: any) => {
      setValues((prev) => ({ ...prev, [field]: value }))
    },
    [],
  )

  const handleSubmit = useCallback(
    async (
      onSubmit: (values: T) => Promise<void> | void,
    ): Promise<boolean> => {
      const fieldErrors = validate(values)
      setErrors(fieldErrors)
      setTouched(
        Object.keys(values).reduce((acc, k) => {
          acc[k as keyof T] = true
          return acc
        }, {} as Partial<Record<keyof T, boolean>>),
      )
      if (Object.keys(fieldErrors).length > 0) return false

      setIsSubmitting(true)
      try {
        await onSubmit(values)
        return true
      } finally {
        setIsSubmitting(false)
      }
    },
    [validate, values],
  )

  const reset = useCallback(
    (next?: Partial<T>) => {
      setValues({ ...initialValues, ...next })
      setErrors({})
      setTouched({})
      setIsSubmitting(false)
    },
    [initialValues],
  )

  const state: FormState<T> = { values, errors, touched, isSubmitting, isValid }

  return {
    ...state,
    handleChange,
    handleBlur,
    setField,
    handleSubmit,
    reset,
    setErrors,
  }
}
