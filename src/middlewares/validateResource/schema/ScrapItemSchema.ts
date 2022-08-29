import { object, string } from 'zod'

const ScrapItemsSchema = object({
  url: string({
    required_error: 'url is required',
    invalid_type_error: 'url has invalid type'
  }).url({
    message: 'Invalid url'
  })
})

export default ScrapItemsSchema
