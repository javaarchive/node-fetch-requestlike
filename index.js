import fetch from "node-fetch";

import EventEmitter from "events";

const defaults = {
    method: "GET"
}

class RequestAcceptableResponse{
    constructor(response){
        this.response = response;
        this.statusCode = response.status;
    }

    async build(){
        // Some methods on node-fetch responses are asynchronous so we can't quite invoke them in the constructor
        return this;
    }
}

class Result extends EventEmitter{
    reqPromise = null;
    
    constructor(promise){
        this.reqPromise = promise;
        this.reqPromise.catch(err => {
            this.emit("error", err); // TODO: check if this is how it's supposed to work
        });
        this.reqPromise.then(resp => {
            (new RequestAcceptableResponse(resp)).build().then(requestCompatResponse => {
                this.emit("response", requestCompatResponse);
            });
        });
    }

    pipe(stream){
        this.reqPromise.then(resp => {
            resp.body.pipe(stream);
        });
    }
}

function request(optionsOrUrl,callback){
    let options = optionsOrUrl;
    
    if(typeof optionsOrUrl == "string"){
        options = {
            ...defaults,
            url: optionsOrUrl
        };
    }else{
        options = {
            ...defaults,
            ...optionsOrUrl
        };
    }
    
    // url

    let url = options.url || options.uri;

    if(!url){
        throw new Error("No url specified");
    }

    // headers

    let headers = {};

    // authentication

    if(options.auth){
        let {user,pass} = options.auth;
        headers["Authorization"] = "Basic " + Buffer.from(`${user}:${pass}`).toString("base64"); // TODO: Faster function?
    }

    // body

    let body = null;

    if(options.form){
        // headers["Content-Type"] = "x-www-form-urlencoded";
        let formAsParams = new URLSearchParams();
        Object.entries(options.form).forEach(([key,value]) => {
            formAsParams.add(key,value);
        });
        body = formAsParams;
    }

    let reqPromise = fetch(url,{
        method: options.method,
        body: body
    });

    /*reqPromise.then((resp) => {

    }).catch((err) => {

    });*/

    return (new Result(reqPromise));
}

export default request;