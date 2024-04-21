enum Colors {
  WHITE = 'white',
  BLACK = 'black',
}
class Player {
  public id: string;
  public color: Colors;

  constructor(color: Colors, id: string) {
    this.color = color;
    this.id = id;
  }
}

export { Colors, Player };
