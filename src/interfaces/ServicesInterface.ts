export interface ServicesInterface {
	logMessage (message? : string) : any;
	pluginClasses: any;
	registerModel (modelName : string, definition: any) : any;
}