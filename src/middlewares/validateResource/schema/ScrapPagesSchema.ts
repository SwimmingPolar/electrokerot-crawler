import { object, string, date, preprocess } from 'zod'

const ScrapPagesSchema = object({
  url: string({
    required_error: 'baseUrl is required',
    invalid_type_error: 'baseUrl has invalid type'
  }).url({
    message: 'Invalid url'
  }),
  pages: string({
    required_error: 'pages is required',
    invalid_type_error: 'pages has invalid type'
  })
    .min(1, {
      message: `page can't be empty string`
    })
    .array()
    .min(1, {
      message: 'pages needs at least 1 item'
    }),
  minimumDate: preprocess(
    date =>
      new Date(
        string({
          invalid_type_error: 'minimumDate has invalid type'
        })
          .min(1, {
            message: `minimumDate can't be empty string`
          })
          .parse(date)
      ),
    date({
      invalid_type_error: 'minimumDate has invalid date string'
    })
  ).optional(),
  ignoreWords: string()
    .min(1, {
      message: `ignore word can'be empty string`
    })
    .array()
    .optional(),
  filters: string()
    .min(1, {
      message: `filter can'be empty string`
    })
    .array()
    .optional()
})

export default ScrapPagesSchema
