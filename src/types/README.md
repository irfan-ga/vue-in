# types/

Types shared across more than one feature.

Most types should not be here. Types describing server data are inferred from zod
schemas (`z.infer<typeof schema>`) and live beside the schema in
`features/<name>/schemas/`, so that validation and types cannot disagree.
