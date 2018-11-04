//// VALUES TO CONFIGURE ////////

const appId: string = 'bb6063b3'
const APIkey: string = '2e55a43d3e62d76f145f28aa7e3990e9'
const lat: string = '-34.55'
const lon: string = '-58.46'

let fakeWeather: string | null = 'heavy rain'

const rainSpeed = 4
const snowSpeed = 1

////////////////////////////////

const callUrl: string =
  'http://api.weatherunlocked.com/api/current/' + lat + ',%20' + lon + '?app_id=' + appId + '&app_key=' + APIkey

export enum Weather {
  sun,
  clouds,
  rain,
  heavyRain,
  snow,
  storm
}

export enum PrecipType {
  drop,
  flake
}


@Component('nextPos')
export class NextPos {
  nextPos: Vector3
  constructor(nextPos: Vector3 = Vector3.Zero()){
    this.nextPos = nextPos
  }
}

@Component('currentWeather')
export class CurrentWeather {
  weather: Weather
  dropsToAdd: number
  flakesToAdd: number
  interval: number
  currentInterval: number
  constructor(weather: Weather =  Weather.sun, dropsToAdd: number = 0, flakesToAdd: number = 0, interval: number = 100, currentInterval: number = 0){
    this.weather = weather
    this.dropsToAdd = dropsToAdd
    this.flakesToAdd = flakesToAdd
    this.interval = interval
    this.currentInterval = interval
  }
}

@Component('isPrecip')
export class IsPrecip {
  type: PrecipType
  constructor(type: PrecipType = PrecipType.drop){
    this.type = type
  }
}

@Component('spinVel')
export class SpinVel{
  vel: Vector3
  constructor(spinVel: Vector3 = Vector3.Zero()){
    this.vel = spinVel
  }  
}

const drops = engine.getComponentGroup(Transform, IsPrecip)
const flakes = engine.getComponentGroup(Transform, IsPrecip, SpinVel)

// API calls not supported for now, here we're only using `fakeWeather`
function getWeather() {
  let weather: Weather = Weather.sun
  if (fakeWeather) {
    weather = mapWeather(fakeWeather)
  } 
  // else {
  //   //console.log('getting new weather')
  //   axios
  //     .get(callUrl)
  //     .then((response: any) => {
  //       //console.log(response.data.wx_desc)
  //       weather = mapWeather(response.data.wx_desc)
  //     })
  //     .catch((error: any) => {
  //       //console.log(error)
  //     })
  // }
  let oldWeather = weatherObject.get(CurrentWeather).weather
  if (weather == oldWeather) {
    return
  }
  weatherObject.get(CurrentWeather).weather = weather
  if (weather == (Weather.sun | Weather.clouds)) {
    return
  }
  startPrecipitation()
}

function mapWeather(weather: string) {
  let simpleWeather: Weather
  if (weather.match(/(thunder)/gi)) {
    simpleWeather = Weather.storm
  } else if (weather.match(/(snow|ice)/gi)) {
    simpleWeather = Weather.snow
  } else if (weather.match(/(heavy|torrential)/gi)) {
    simpleWeather = Weather.heavyRain
  } else if (weather.match(/(rain|drizzle|shower)/gi)) {
    simpleWeather = Weather.rain
  } else if (weather.match(/(cloud|overcast|fog|mist)/gi)) {
    simpleWeather = Weather.clouds
  } else {
    simpleWeather = Weather.sun
  }
  return simpleWeather
}

function startPrecipitation() {
  let weather = weatherObject.get(CurrentWeather)
  switch (weather.weather) {
    case Weather.storm:
      weather.dropsToAdd = 100
      weather.flakesToAdd = 0
      weather.interval = rainSpeed/weather.dropsToAdd
      break
    case Weather.snow:
      weather.dropsToAdd = 0
      weather.flakesToAdd = 50
      weather.interval = snowSpeed * 10 /weather.flakesToAdd
      break
    case Weather.heavyRain:
      weather.dropsToAdd = 50
      weather.flakesToAdd = 0
      weather.interval = rainSpeed/weather.dropsToAdd
      break
    case Weather.rain:
      weather.dropsToAdd = 10
      weather.flakesToAdd = 0
      weather.interval = rainSpeed  /weather.dropsToAdd  //(10/(0.033*rainSpeed)*30 ) /weather.dropsToAdd
      break
  }
  
}


export class SpawnSystem {
  update(dt: number) {
      const weather = weatherObject.get(CurrentWeather)
      if (weather.dropsToAdd > 1) {
        weather.currentInterval += dt
        if (weather.currentInterval >= weather.interval){
          spawnRain()
          weather.dropsToAdd -= 1
          log('spawning rain')
          weather.currentInterval = 0
        }
      } 
      if (weather.flakesToAdd > 1) {
        weather.currentInterval += dt
        if (weather.currentInterval >= weather.interval){
          spawnSnow()
          weather.flakesToAdd -= 1
          log('spawning snow')
          weather.currentInterval = 0
        }
      } 
    } 
}

export class FallSystem {

  update(dt: number) {
    for (let drop of drops.entities) {
      let position = drop.get(Transform).position
      let type = drop.get(IsPrecip).type

      if (type == PrecipType.drop){
        position.y = position.y - (dt * rainSpeed)
      }
      else if (type == PrecipType.flake){
        position.y = position.y - (dt * snowSpeed)
      }
      
      if (position.y < 0) {
        position.x = Math.random() * 8 + 1
        position.y = 10
        position.z = Math.random() * 8 + 1
      }
    }
  }
}


export class RotateSystem {

  update(dt: number) {
    for (let flake of flakes.entities) {
      const vel = flake.get(SpinVel).vel
      let rotation = flake.get(Transform).rotation
      rotation.x =+ vel.x
      rotation.y =+ vel.y
      rotation.z =+ vel.z
    }
  }
}


const weatherObject = new Entity()
weatherObject.set(new CurrentWeather())
engine.addEntity(weatherObject)

const buttonMaterial = new Material()
buttonMaterial.albedoColor = '#FF0000'
buttonMaterial.metallic = 0.9
buttonMaterial.roughness = 0.1


const makeItRain = new Entity()

makeItRain.set(new Transform())
makeItRain.get(Transform).position.set(1, 1, 1,)
makeItRain.set(new BoxShape())
makeItRain.set(buttonMaterial)

makeItRain.set(
  new OnClick(_ => {
    getWeather()
    setHouse()
    log('clicked')
  })
)

engine.addEntity(makeItRain)

function spawnRain() {
  const drop = new Entity()
  drop.set(new IsPrecip())
  drop.get(IsPrecip).type = PrecipType.drop

  let dropTransform = new Transform()
  dropTransform.position.x = Math.random() * 8 + 1
  dropTransform.position.y = 10
  dropTransform.position.z = Math.random() * 8 + 1
  dropTransform.scale.x = 0.15
  dropTransform.scale.y = 0.15
  dropTransform.scale.z = 0.15

  drop.set(dropTransform)
 
  //drop.set(new PlaneShape())
  const plane = new PlaneShape()
  //plane.uvs = [0, 0.75, 0.25, 0.75, 0.25, 1, 0, 1, 0, 0.75, 0.25, 0.75, 0.25, 1, 0, 1]
  drop.set(plane)
  drop.set(dropMaterial)
  
  engine.addEntity(drop)
}


function spawnSnow() {
  const flake = new Entity()
  flake.set(new IsPrecip())
  flake.get(IsPrecip).type = PrecipType.flake

  let flakeTransform = new Transform()
  flakeTransform.position.x = Math.random() * 8 + 1
  flakeTransform.position.y = 10
  flakeTransform.position.z = Math.random() * 8 + 1

  flakeTransform.rotation.x = Math.random() * 180
  flakeTransform.rotation.y = Math.random() * 180
  flakeTransform.rotation.z = Math.random() * 180

  flakeTransform.scale.x = 0.3
  flakeTransform.scale.y = 0.3
  flakeTransform.scale.z = 0.3

  flake.set(flakeTransform)

  //flake.set(new PlaneShape())
  flake.set(new SpinVel())
  flake.get(SpinVel).velocityX = Math.random() * 10
  flake.get(SpinVel).velocityY = Math.random() * 10
  flake.get(SpinVel).velocityZ = Math.random() * 10

  const plane = new PlaneShape()
  plane.uvs = [0, 0.75, 0.25, 0.75, 0.25, 1, 0, 1, 0, 0.75, 0.25, 0.75, 0.25, 1, 0, 1]
  flake.set(plane)

  let materialIndex = Math.floor(Math.random() * 15)


  flake.set(flakeMaterial[materialIndex])


  engine.addEntity(flake)
}

engine.addSystem(new FallSystem())
engine.addSystem(new SpawnSystem())


// DEFINE MATERIALS
const dropMaterial = new BasicMaterial()
dropMaterial.texture = 'materials/drop.png'
dropMaterial.samplingMode = 0

const flakeMaterial: BasicMaterial[] = []
for (let i = 0; i < 15; i ++)
{
  let material = new BasicMaterial()
  material.texture =  "materials/flake" + i + ".png"
  material.samplingMode = 0
  flakeMaterial.push(material)
}


// ADD HOUSE

const house = new Entity()
const houseGLTF = new GLTFShape('models/house_dry.gltf')
house.set(houseGLTF)

function setHouse(){
  let weather = weatherObject.get(CurrentWeather)
  switch (weather.weather) {
    case Weather.storm:
      house.set(new GLTFShape("models/house_wet.gltf" ))
      break
    case Weather.snow:
      house.set(new GLTFShape("models/house_snow.gltf" ))
      break
    case Weather.heavyRain:
      house.set(new GLTFShape("models/house_wet.gltf" ))
      break
    case Weather.rain:
      house.set(new GLTFShape("models/house_wet.gltf" ))
      break
  }
}


house.set(new Transform())
house.get(Transform).position.set(5, 0, 5)


engine.addEntity(house)
