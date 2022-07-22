import { object, string } from 'zod'

const ScrapItemsSchema = object({
  url: string({
    required_error: 'baseUrl is required',
    invalid_type_error: 'baseUrl has invalid type'
  }).url({
    message: 'Invalid url'
  })
})

export default ScrapItemsSchema
