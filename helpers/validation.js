module.exports = {
  validationJoi: async (data, schema) => {
    const validSchema = await schema.validate(data);
    if (validSchema && validSchema.error) {
      throw validSchema.error;
    } else {
      return validSchema.value;
    }
  },
};
