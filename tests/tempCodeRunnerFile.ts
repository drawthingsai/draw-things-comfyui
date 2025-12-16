for (const key in files) {
	const file = files[key];
	files[key] = await imageToVectorBase64(file, 12);
}
console.log(files);