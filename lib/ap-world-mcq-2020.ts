// AP World History: Modern — 2020 Practice Exam 2 (MCQ)
// Extraído do Answer Key oficial do College Board.
// 55 questões de múltipla escolha. Use para a feature "Simulado AP".

export interface APMCQQuestion {
  n: number
  question: string
  options: { A: string; B: string; C: string; D: string }
  answer: "A" | "B" | "C" | "D"
  explanation: string
}

export const apWorldMcq2020: APMCQQuestion[] = [
  {
    "n": 1,
    "question": "All of the following developments in Song dynasty China were important factors in the accumulation of wealth outlined in the first paragraph EXCEPT",
    "options": {
      "A": "increased Chinese involvement in the Indian Ocean trade",
      "B": "an increase in agricultural production in China",
      "C": "increased Chinese production of manufactured goods",
      "D": "an increase in technological innovations in China"
    },
    "answer": "A",
    "explanation": "While some Chinese merchants were involved in trade in the Indian Ocean and the South China Sea during the Song dynasty, these trade contacts were limited. Because the question asks for the development that was not an important factor as outlined in the first paragraph, this answer choice is correct. Maritime trade in the Indian Ocean was not a significant factor contributing to Song economic expansion."
  },
  {
    "n": 2,
    "question": "Which of the following statements from the second paragraph most directly supports the claim that the examination system strengthened the Chinese states?",
    "options": {
      "A": "The statement that most successful candidates “required a measure of economic support that was simply not available to poor people”",
      "B": "The statement that “when an old dynasty was replaced by a new, the latter usually undertook an early revival of the examination system practically unchanged”",
      "C": "The statement that “the examinations not only produced officials loyal to the state but also, at times, resentful rejected applicants who opposed the system”",
      "D": "The statement that “the very idea that everyone should be eligible for the examinations . . . was incomparably forward-looking in its day” AP WORLD HISTORY: MODERN"
    },
    "answer": "B",
    "explanation": "The fact that multiple Chinese dynasties adopted the “examination system practically unchanged” strongly supports the claim that the examination system strengthened Chinese states."
  },
  {
    "n": 3,
    "question": "Which of the following best describes the author’s claim about the Chinese examination system in the second paragraph?",
    "options": {
      "A": "The system provided limited but important opportunities for social advancement in Chinese society.",
      "B": "The system strongly reinforced rigid class distinctions between nobles and commoners in Chinese society.",
      "C": "By offering opportunities to female scholars, the system elevated the prestige of women in Chinese society.",
      "D": "By encouraging conformism and obedience, the system prevented efforts to reform and modernize Chinese society in the nineteenth century."
    },
    "answer": "A",
    "explanation": "The author argues that, despite some discrepancies between principle and practice, the imperial examinations did offer an important social opportunity to “all qualified applicants regardless of social background.” Those who passed the examinations became members of the Chinese imperial bureaucracy, thereby joining the socioeconomic elites."
  },
  {
    "n": 4,
    "question": "Which of the following led most directly to the development of the trading network on the map?",
    "options": {
      "A": "The growth of trading cities on the Swahili Coast",
      "B": "Innovations in transportation and commercial technologies such as caravanserai",
      "C": "The overall decline in the trade of goods along the Silk Roads",
      "D": "The emergence of the trans-Atlantic slave trade in West Africa"
    },
    "answer": "B",
    "explanation": "New transportation and commercial technologies such as the caravanserai led directly to the expansion of the trans-Saharan trade routes on the map by allowing merchants and traders to travel farther and to more places throughout North and West Africa."
  },
  {
    "n": 5,
    "question": "Which of the following contributed most directly to an increase in trade along the routes on the map?",
    "options": {
      "A": "The expansion of empires such as Mali in West Africa",
      "B": "The expansion of the Mongol Empire across Eurasia",
      "C": "The start of the Protestant Reformation in western Europe",
      "D": "The completion of the Christian Reconquista of Spain"
    },
    "answer": "A",
    "explanation": "The growth of states like Mali in West Africa increased the volume of trade along the routes by drawing more people, wealth, and products into the economies along the trade routes in West and North Africa."
  },
  {
    "n": 6,
    "question": "The spread of which of the following religious traditions was most directly facilitated by trade along the routes shown on the map?",
    "options": {
      "A": "Christianity",
      "B": "Buddhism",
      "C": "Islam",
      "D": "Judaism"
    },
    "answer": "C",
    "explanation": "Islam was the main religion that spread along the trade routes in West and North Africa during the period identified on the map, mostly because the major states involved in the overland trans-Saharan trade were Muslim."
  },
  {
    "n": 7,
    "question": "In the period after circa 1450, trade along the routes shown on the map declined in large part because of the",
    "options": {
      "A": "decrease in the demand for African manufactured goods in Europe",
      "B": "collapse of European economies in the wake of the bubonic plague",
      "C": "disruption caused by the adoption of new gunpowder weapons",
      "D": "increase of maritime trade along the African coast"
    },
    "answer": "D",
    "explanation": "The increase in maritime trade along the coast of Africa allowed Europeans to bypass the inland routes controlled by African merchants, leading to a gradual decline in the overland Trans-Saharan trade. “Wila Uma, the Inca general, addressed the Spanish [conquistadors] with the following words: ‘What are you doing to our ruler?* This is how you repay his good will? Did he not command all of his people to give you tribute? Did he not give you a house filled with gold and silver? Did he not give you his servants to serve you? What more can he give you now that you have imprisoned him? All the peo"
  },
  {
    "n": 8,
    "question": "The sentiments expressed by Wila Uma in the passage most clearly illustrate which of the following aspects of the Inca state?",
    "options": {
      "A": "The persistence of cultural diversity within the empire",
      "B": "The influence of technological innovation in expanding the empire",
      "C": "The importance of the Inca ruler to the empire",
      "D": "The extensive territorial extent of the empire"
    },
    "answer": "C",
    "explanation": "In the passage, Wila Uma comments that the people of the Inca Empire are “distressed” by the imprisonment of Manco Inca, and that their “distress” offers them no good course of action. This illustrates the importance of the monarchy and the person of the king to the Inca Empire."
  },
  {
    "n": 9,
    "question": "Which of the following was the most important long-term effect of the European acquisition of the wealth and resources of the Americas, as alluded to in the passage?",
    "options": {
      "A": "A lasting shift in the balance of trade between Europe and Asia",
      "B": "The decline of feudalism in Europe",
      "C": "A decrease in the influence of Christianity worldwide",
      "D": "The end of Chinese maritime exploration in the Indian Ocean"
    },
    "answer": "A",
    "explanation": "The Spanish demands for precious metals alluded to in the passage, and subsequent Spanish discoveries of precious metals in the Americas, changed the global silver trade flow patterns, leading to a long-term shift in the balance of trade between Europe and Asia. As a result, some European countries benefited economically at the expense of Asian countries."
  },
  {
    "n": 10,
    "question": "The sentiments expressed in the passage most directly indicate",
    "options": {
      "A": "opposition to growing syncretic religions",
      "B": "concerns about the spread of epidemic diseases",
      "C": "frustration over the establishment of forced labor systems",
      "D": "resistance to European colonial expansion and control"
    },
    "answer": "D",
    "explanation": "The passage condemns the Spanish conquistadors’ greed and demands that they release the Inca ruler from his captivity. These sentiments show the emergence of Inca resistance to the Spanish conquest."
  },
  {
    "n": 11,
    "question": "Which of the following most directly facilitated the conquest alluded to in the passage?",
    "options": {
      "A": "Spanish control of the trans-Atlantic slave trade",
      "B": "Spanish advantages over native American populations in terms of technology and disease immunity",
      "C": "The completion of the reconquest of the Iberian Peninsula",
      "D": "The establishment of a cash-crop plantation economy on some of the islands in the in the Atlantic Ocean"
    },
    "answer": "B",
    "explanation": "Spanish use of steel swords and gunpowder weapons, along with the relative immunity of the Spanish to diseases like smallpox, allowed them to conquer the Inca Empire."
  },
  {
    "n": 12,
    "question": "Which of the following is the most likely purpose of Titu Cusi’s letter?",
    "options": {
      "A": "To encourage rebellion among the subjects of the Inca Empire",
      "B": "To gain help from Christian missionaries in completing the conversion of his subjects",
      "C": "To characterize the Spanish conquest of the Inca Empire as unjust and illegitimate",
      "D": "To increase the political reach of the Inca Empire to its pre-conquest borders"
    },
    "answer": "C",
    "explanation": "In asserting to the Spanish king that the initial Spanish conquest of the Inca Empire had been marked by violence, greed, and injustice on the part of the conquistadors, Titu Cusi is most likely seeking to argue that the Spanish conquest of the Inca Empire as unjust and illegitimate. LIU GUANDAO, YUAN DYNASTY CHINESE COURT PAINTER, WHILING AWAY THE SUMMER, PAINTED SCROLL, CIRCA 1280 The Picture Art Collection / Alamy Stock Photo The image depicts a Chinese Confucian scholar and two female attendants."
  },
  {
    "n": 13,
    "question": "The image can best be used as a source of information about the",
    "options": {
      "A": "social prestige of established educated elites in Chinese society under Mongol rule",
      "B": "influence of Christian missionaries in Mongol-controlled China",
      "C": "high status of wealthy merchants in traditional Chinese society",
      "D": "increased importance of Mongol Buddhism and shamanism on Chinese society under Yuan rule"
    },
    "answer": "A",
    "explanation": "The importance of Confucian learning and the prestige it provided to scholars remained significant in Chinese society, continuing through the Mongol-led Yuan Dynasty. The image of a scholar surrounded by luxury items and servants supports the idea that Confucian learning continued to confer high status to scholars under Yuan rule."
  },
  {
    "n": 14,
    "question": "Which of the following historical continuities is best reflected in the image?",
    "options": {
      "A": "Chinese art reflected European methods of painting.",
      "B": "Chinese art continued to emphasize traditional subjects and styles.",
      "C": "Chinese art incorporated elements of Central Asian nomadic life.",
      "D": "Chinese art continued to stress the importance of technological innovation."
    },
    "answer": "B",
    "explanation": "The subject of the painting (a Chinese scholar) and the style used to render the subject (a painted scroll) are common to paintings from many periods of Chinese history and support the idea that the image reflects continued emphasis on these elements."
  },
  {
    "n": 15,
    "question": "In addition to China, the cultural tradition alluded to in Liu Guandao’s painting strongly influenced the society and culture of",
    "options": {
      "A": "the Ottoman Empire",
      "B": "India",
      "C": "Persia",
      "D": "Korea"
    },
    "answer": "D",
    "explanation": "Confucianism played a major role in Korean society and culture."
  },
  {
    "n": 16,
    "question": "Which of the following conclusions regarding the Ottoman Empire is best supported by the passage?",
    "options": {
      "A": "Ottoman policies sought to limit the activities of some religious groups.",
      "B": "Many members of the Ottoman religious establishment practiced Sufism.",
      "C": "Ottoman rulers promoted an inclusive and tolerant interpretation of Islamic doctrine.",
      "D": "Ottoman policies toward Sufism caused conflicts between the Ottoman Empire and other Muslim states."
    },
    "answer": "A",
    "explanation": "The passage shows that Ottoman authorities, represented by the Sunni religious scholars, condemned some Sufi practices and sought to suppress them."
  },
  {
    "n": 17,
    "question": "Which of the following most directly strengthened Sunni religious scholars’ role as official interpreters of Islamic doctrine within the Ottoman Empire, as suggested by the passage?",
    "options": {
      "A": "The establishment of the Mughal Empire in India",
      "B": "The Ottoman conquest of Constantinople",
      "C": "Ottoman sultans’ extensive conquests in Europe",
      "D": "The Ottoman Empire’s rivalry with the Safavid Empire"
    },
    "answer": "D",
    "explanation": "Conflicts with the Shi‘a Safavid Empire, fueled by religious differences, led Sunni scholars in the Ottoman Empire to attempt to enforce stricter adherence to Sunni orthodoxy, contributing to their critical views of Sufism."
  },
  {
    "n": 18,
    "question": "The author’s position on the religious controversy in the passage can best be described as that of",
    "options": {
      "A": "a strong supporter of the official Ottoman religious establishment",
      "B": "an impartial observer describing the controversy without taking sides",
      "C": "a practitioner of the Sufi way with its emphasis on increased spirituality",
      "D": "an advocate of the right of the people to freely choose their own religion"
    },
    "answer": "B",
    "explanation": "The author describes the arguments of both sides to the debate and does not appear to openly criticize or endorse either side, suggesting that he is trying to present an objective view of the Sunni-Sufi rivalry."
  },
  {
    "n": 19,
    "question": "Outside of the Ottoman Empire, Sufis contributed most directly to which of the following during the period before 1750?",
    "options": {
      "A": "Scientific exchanges between the Muslim world and the rest of Afro-Eurasia",
      "B": "The establishment of Arabic as the language of philosophy and theology in the Muslim world",
      "C": "The spread of Islam to new locations on the margins of the Muslim world, such as southeast Asia",
      "D": "The introduction of new practices for recruiting and training slave soldiers in Muslim states, such as the Mughal Empire"
    },
    "answer": "C",
    "explanation": "Sufis were instrumental in the spread of Islam to new locations in this period, both through the popularity of Sufi religious practices with merchants and through the ability of Sufi leaders to effect the conversion of political leaders in some regions on the margins of the Muslim world"
  },
  {
    "n": 20,
    "question": "The object shown in the image is best understood in the context of which of the following developments between 1450 and 1750 ?",
    "options": {
      "A": "The introduction of Chinese religious and cultural influences in Japan",
      "B": "The fall of the Tokugawa Shogunate and restoration of direct imperial rule",
      "C": "The growth of Russian cultural influence in East Asia as a result of the Russian expansion into Siberia",
      "D": "The influence of European merchants and missionaries along Asian maritime trade routes"
    },
    "answer": "D",
    "explanation": "Trade routes had brought both European merchants and missionaries to Japan, eventually leading to a backlash against foreign influences such as Christianity under the Tokugawa regime."
  },
  {
    "n": 21,
    "question": "The use of objects such as the one shown in the image best illustrates which of the following historical processes from 1450 to 1750 ?",
    "options": {
      "A": "Some Asian states sought to limit foreign encroachment in their internal affairs.",
      "B": "Political leaders in Asia commissioned works of art to legitimize their rule.",
      "C": "Religious conversion by state rulers was often followed by the mass conversion of state populations.",
      "D": "The territorial expansion of Asian land-based empires limited European influence in many parts of Asia."
    },
    "answer": "A",
    "explanation": "States such as China and Japan imposed restrictions on Christian missionary activity in hopes of reducing or eliminating foreign, particularly European, influence in their countries."
  },
  {
    "n": 22,
    "question": "In the late nineteenth century, Japanese attitudes toward European cultural influences changed as a direct result of",
    "options": {
      "A": "Japan isolating its economy from trade with Western markets",
      "B": "Japan enacting political reforms during the Meiji Era",
      "C": "Japan defeating China in the First Sino-Japanese War",
      "D": "Japan extending its empire over most of Southeast Asia"
    },
    "answer": "B",
    "explanation": "Meiji-Era political reforms, such as the adoption of a constitutional monarchy, reflected a significant shift toward Western political norms."
  },
  {
    "n": 23,
    "question": "In which of the following regions between 1450 and 1750 was Christian missionary activity met with the LEAST amount of resistance by non-European states?",
    "options": {
      "A": "The Americas",
      "B": "The Middle East",
      "C": "The Indian subcontinent",
      "D": "Central Asia"
    },
    "answer": "A",
    "explanation": "Christian missionaries, often with state support from Spain and Portugal, were very successful in converting many Native Americans to Catholic Christianity in Central and South America. Due to the European conquest of the major indigenous states in the Americas, there was little state resistance to"
  },
  {
    "n": 24,
    "question": "The passage best illustrates which of the following features of colonial Latin American history?",
    "options": {
      "A": "Racial categories were used to divide colonial societies.",
      "B": "Christian religious practices were shared by many social groups.",
      "C": "Plantation agriculture dominated economic production.",
      "D": "Competition between European states influenced colonialism."
    },
    "answer": "B",
    "explanation": "The Christian Portuguese made efforts to spread their faith as early as the sixteenth century to all levels of society, including to native Brazilian and African slaves. The author, a former slave who purchased her freedom, affirms the continuity of this practice in the nineteenth century when she declares her Catholic faith in the first sentence."
  },
  {
    "n": 25,
    "question": "The passage best supports which of the following statements?",
    "options": {
      "A": "A small number of women were able to acquire wealth and property on their own.",
      "B": "Slaves were permitted to maintain families of their own.",
      "C": "Women contributed to the family income by weaving textiles.",
      "D": "Women were the legal heads of the household in most families."
    },
    "answer": "A",
    "explanation": "The author states that she never married, had five children, and acquired property on her own. She did so at a time when it was more common for women to marry and acquire property as a consequence of marriage or inheritance."
  },
  {
    "n": 26,
    "question": "As described in the passage, Anna da Trindade’s life differed from the typical experience of newly arrived slaves in colonial Latin America in that she was",
    "options": {
      "A": "transported to Brazil",
      "B": "baptized as a Christian",
      "C": "born in Africa",
      "D": "able to purchase her freedom"
    },
    "answer": "D",
    "explanation": "While the freeing of slaves was not unusual in colonial Latin America, it was not the norm. For the most part, slaves could not acquire the necessary funds to buy their own freedom. Yet the author was clearly able to procure the money to buy her freedom, making her experience atypical."
  },
  {
    "n": 27,
    "question": "Which of the following was the most significant change in Latin American labor systems between the time the document was produced and 1900 ?",
    "options": {
      "A": "Slavery was abolished in all Latin American countries.",
      "B": "Many Latin American countries industrialized.",
      "C": "Indentured servitude became the main source of labor in most Latin American countries.",
      "D": "Most Latin American countries passed laws limiting the labor of women and children."
    },
    "answer": "A",
    "explanation": "Slavery was abolished throughout Latin America once Brazil legally ended the practice in 1888. This marked the end of the slave labor system in the Americas. “Italy has 108 inhabitants per square kilometer. In proportion to its territory, only three countries in Europe surpass Italy in population density: Belgium, the Netherlands, and Great Britain. Every year, 100,000 farmers and agricultural laborers emigrate from Italy. Italy witnesses its place in the family of civilized nations growing smaller and smaller as it looks on with fear for its political and economic future. In fact, during the "
  },
  {
    "n": 28,
    "question": "The perspective of the author in the first paragraph can best be understood in the context of which of the following nineteenth-century developments?",
    "options": {
      "A": "The expansion of Catholicism in Africa and the Americas",
      "B": "The development of new military technologies due to industrialization",
      "C": "Competition among European states for global power and influence",
      "D": "Increasing African immigration to Italy"
    },
    "answer": "C",
    "explanation": "Martini expresses his concern that the number of Italian-speaking people around the globe has risen slowly compared to the growth of other European nations. This concern is directly related to the belief, shared by many in the late nineteenth century, that nations are engaged in a competition for land and resources, and that slower growth is a sign of national decline."
  },
  {
    "n": 29,
    "question": "The author’s statement that descendants of Italian emigrants “ended up forgetting the language of their fathers and forefathers” most directly refers to which of the following aspects of nineteenth-century migration?",
    "options": {
      "A": "Some receiving societies attempted to limit the flow of immigrants.",
      "B": "Some colonial states applied theories of Social Darwinism to establish racial preferences.",
      "C": "Immigrants often adopted the dominant culture of the state in receiving societies.",
      "D": "Immigrants often maintained some aspects of their religion within ethnic enclaves."
    },
    "answer": "C",
    "explanation": "In many cases, second-generation immigrants began speaking the language of the receiving societies where they migrated, often possessing little to no proficiency in the language of their ancestors, a clear concern for Martini."
  },
  {
    "n": 30,
    "question": "Italian and German imperial presence in Africa were similar in that both countries",
    "options": {
      "A": "saw African colonies as secondary to their interests in Asia",
      "B": "were newly unified nations that began colonizing later than other European powers",
      "C": "primarily used their colonies in Africa to spread Christianity",
      "D": "invested heavily in African infrastructure and economic development"
    },
    "answer": "B",
    "explanation": "As recently unified nations, both Italy and Germany were attempting to achieve some degree of parity with more established imperial powers such as Great Britain and France."
  },
  {
    "n": 31,
    "question": "Martini’s argument in the second paragraph most clearly refers to the late-nineteenth-century belief that imperialism was a useful way to",
    "options": {
      "A": "relieve overcrowding and land shortages in European countries",
      "B": "secure raw materials for European factories",
      "C": "promote scientific and technological progress",
      "D": "“civilize” native populations through social change"
    },
    "answer": "A",
    "explanation": "The author’s assertion that Italy should focus on establishing an agricultural colony in Eritrea instead of developing land back home refers directly to a belief that imperialism would provide a way for"
  },
  {
    "n": 32,
    "question": "As described in the passage, the voting requirements in Japan circa 1878 most directly reflect the continuing influence of",
    "options": {
      "A": "societal norms that assigned women lower status than the status of men",
      "B": "nationalistic ideals that mobilized Japanese men to support imperial expansion",
      "C": "middle-class ideals that motivated women to seek work outside the household",
      "D": "Buddhist principles that emphasized the spiritual equality of men and women"
    },
    "answer": "A",
    "explanation": "The author states that despite the fact that she is the head of her family, she is not allowed to vote. The fact that only men were allowed to vote in Meiji Japan illustrates the continued influence of patriarchal social norms."
  },
  {
    "n": 33,
    "question": "The author’s argument regarding taxation most closely resembles the arguments made by",
    "options": {
      "A": "Enlightenment thinkers regarding natural rights and the social contract",
      "B": "working-class movements regarding better wages and working conditions",
      "C": "abolitionist movements regarding the need to end the Atlantic slave trade",
      "D": "conservative thinkers regarding the need to preserve the social status of landed elites"
    },
    "answer": "A",
    "explanation": "The author’s arguments about taxation and voting are very similar to Enlightenment ideas of natural rights, and political representation as part of the social contract."
  },
  {
    "n": 34,
    "question": "Based on the passage, the author would most likely support which of the following policies?",
    "options": {
      "A": "Adopting a socialist system of government to reduce economic inequalities in Japanese society",
      "B": "Providing greater educational opportunities to increase women’s economic independence",
      "C": "Industrializing the Japanese economy to increase the standard of living for all Japanese citizens",
      "D": "Returning Japan’s political order to the way it was under the Tokugawa Shogunate"
    },
    "answer": "B",
    "explanation": "The author discusses the importance of expanding rights and opportunities for women, specifically the idea that greater educational opportunities will help to increase women’s economic independence."
  },
  {
    "n": 35,
    "question": "The type of grievances outlined by the author in the passage was a key contributing factor in the outbreak of which of the following?",
    "options": {
      "A": "The American Revolution",
      "B": "The Haitian Revolution",
      "C": "The First World War",
      "D": "The Second World War"
    },
    "answer": "A",
    "explanation": "“No taxation without representation” was a key grievance of the colonists in British North American colonies in the lead-up to the American Revolution."
  },
  {
    "n": 36,
    "question": "The photograph best illustrates which aspect of population movements in the late nineteenth and early twentieth centuries?",
    "options": {
      "A": "They often involved the spread of cultural traditions into new locations.",
      "B": "They were often undertaken to displace labor force lost to war or disease.",
      "C": "They often resulted in the decline or disappearance of native religious traditions.",
      "D": "They often caused intercommunal violence."
    },
    "answer": "A",
    "explanation": "The photograph shows Indian Muslim troops performing the Muslim communal prayer in England, illustrating the effect of long-distance population movements such as those related to troop mobilization and deployment in spreading cultural traditions to new locations."
  },
  {
    "n": 37,
    "question": "The experiences of soldiers such as those shown in the photograph most likely contributed to which of the following developments after 1918 ?",
    "options": {
      "A": "Conflict between Hindus and Muslims in India",
      "B": "The rise of authoritarian governments between the world wars",
      "C": "The idea that all Muslims should unite politically under the Ottoman sultan",
      "D": "Growing anti-imperial opposition in European colonies such as India"
    },
    "answer": "D",
    "explanation": "Many former colonial soldiers’ experiences of the extreme brutality of the First World War led directly to disillusionment with European claims of cultural superiority as a justification for imperial rule, resulting in increasing opposition to European rule after 1918."
  },
  {
    "n": 38,
    "question": "The situation shown in the image is best understood in the context of which of the following aspects of twentieth- century warfare?",
    "options": {
      "A": "States used propaganda to intensify patriotism in times of war.",
      "B": "States used new industrial technologies to fight wars that were deadlier and more expensive.",
      "C": "States made full use of their populations and material resources to fight total wars.",
      "D": "States increasingly mobilized their citizens for warfare regardless of gender or class."
    },
    "answer": "C",
    "explanation": "The presence of Indian troops in England at the time this photograph was taken provides direct evidence for the use of colonial troops in conflicts such as the First World War."
  },
  {
    "n": 39,
    "question": "As shown in the image, the deployment of soldiers by European powers most directly relates to which of the following causes of conflict during the early twentieth century?",
    "options": {
      "A": "The network of rival alliance systems",
      "B": "Imperialist expansion and competition for resources",
      "C": "Decline in global economic production and trade",
      "D": "The emergence of revolutionary communism"
    },
    "answer": "B",
    "explanation": "The troops shown in the image are located in England in 1916 and were recruited from Britain’s"
  },
  {
    "n": 40,
    "question": "The table best supports which of the following conclusions?",
    "options": {
      "A": "European powers did not provide financial support for the maintenance of their colonies.",
      "B": "European powers maintained colonies despite global war and economic depression.",
      "C": "Europeans migrated and established settler communities in Africa.",
      "D": "Revenue from cash crops accounted for the majority of “other income” in French African colonies."
    },
    "answer": "B",
    "explanation": "The list of revenues and expenditures shown in the table for French-controlled Togo in 1938 illustrates that European powers continued to maintain overseas colonies despite the devastation of the First World War and the Great Depression."
  },
  {
    "n": 41,
    "question": "The revenues section of the table can best be used to illustrate which of the following continuities between pre-1900 and post-1900 European imperialism?",
    "options": {
      "A": "Competition between European colonial powers encouraged imperial expansion.",
      "B": "Some African peoples successfully resisted colonial economic exploitation.",
      "C": "Colonial powers directly subsidized most of the expenditures needed to maintain their colonies.",
      "D": "Colonial powers sought to extract wealth and economic resources from the colonized peoples."
    },
    "answer": "D",
    "explanation": "European states established colonies, in part, to extract wealth and natural resources. The list illustrates this motivation in that “Direct taxes on the people” and “Taxes on domestic production and imports” provide the bulk of the revenues of the Togo colonial government."
  },
  {
    "n": 42,
    "question": "The expenditures shown in the table most strongly illustrate which of the following?",
    "options": {
      "A": "Despite some medical advances, the environment in Africa continued to present unique challenges to European imperialism.",
      "B": "Despite economic challenges they faced at home, European imperial powers continued to finance local manufacturing in their colonies.",
      "C": "The primary objective of European imperialism in Africa was to stop the rule of private joint-stock companies.",
      "D": "European colonial powers did not build roads, bridges, or railways in the African territories under their control."
    },
    "answer": "A",
    "explanation": "The table shows significant expenditures related to “sleeping sickness-related personnel and other medical costs.” Sleeping sickness was one of the many medical challenges that Africa’s environment posed to European colonial expansion in the pre-antibiotic era."
  },
  {
    "n": 43,
    "question": "Which of the following pieces of data from the table most directly contradicts the claims of European imperial powers that colonies existed for the benefit of the colonized?",
    "options": {
      "A": "Colonized peoples were expected to pay taxes to support the colonial government.",
      "B": "Expenditures on administrative salaries were far greater than what was spent on public works and infrastructure.",
      "C": "The colonial government received income from the postal system and from telegraph services.",
      "D": "A significant portion of the colonial budget was provided by the French government."
    },
    "answer": "B",
    "explanation": "Europeans often justified their presence in the colonies as a “civilizing” mission pursued for the good of the colonized peoples. The disparity between administrative salaries and the spending on public works shown in the table demonstrates that colonial officials received the majority of revenues generated by the colony of Togo. Programs to benefit the Togolese people received relatively little funding compared to the salaries of European officials."
  },
  {
    "n": 44,
    "question": "Taken together, the two sources best support which of the following conclusions regarding the situation in British India in 1940?",
    "options": {
      "A": "The British skillfully manipulated religious tensions within India to rally support for the imperial war effort.",
      "B": "Indian opposition to British rule involved groups pursuing very different political goals.",
      "C": "Indian Muslim religious scholars rejected Gandhi’s emphasis on nonviolence to achieve political change.",
      "D": "There was a clear difference between Hindu and Muslim visions of what postwar India should be."
    },
    "answer": "B",
    "explanation": "While both authors oppose continued British rule and are discussing plans for the future of the Indian subcontinent after the departure of the British, their statements indicate completely different approaches to the question of whether Indian Muslims should form their own state or remain as a"
  },
  {
    "n": 45,
    "question": "During the negotiations to end British rule in India in the aftermath of the Second World War, British actions were ultimately most strongly influenced by which of the following arguments?",
    "options": {
      "A": "The argument in Source 1 that, for the British, “the concept of party government and parliamentary rule has become the ideal . . . for every country”",
      "B": "The argument in Source 1 that “to yoke together two such nations under a single state” would lead to “destruction”",
      "C": "The argument in Source 2 that “religious and cultural differences should not interfere with [Indians’] shared association with our homeland.”",
      "D": "The argument in Source 2 that “the [Indian National] Congress . . . has made provisions for the protection of all religions, cultures, and languages in a future Indian state”"
    },
    "answer": "B",
    "explanation": "The British ultimately accepted the arguments put forward by Jinnah and the Muslim League and decided to partition India."
  },
  {
    "n": 46,
    "question": "In the second half of the twentieth century, the kind of tensions illustrated by the two sources would most directly lead to the emergence of which of the following in postcolonial Asian and African states?",
    "options": {
      "A": "Communist movements",
      "B": "Popular movements advocating the restoration of colonial rule",
      "C": "Movements advocating for regional autonomy",
      "D": "Famines and epidemics"
    },
    "answer": "C",
    "explanation": "Religious and ethnic differences in newly independent African and Asian states with boundaries inherited from the colonial period often led to the emergence of separatist movements that advocated for local or regional autonomy or, sometimes, for complete independence."
  },
  {
    "n": 47,
    "question": "The overall trend in global carbon dioxide emissions as shown in Graph 1 was primarily caused by the",
    "options": {
      "A": "increased use of petroleum and other fossil fuels",
      "B": "destruction of rain forests and expansion of deserts",
      "C": "development of genetically modified crops",
      "D": "proliferation of nuclear weapons"
    },
    "answer": "A",
    "explanation": "Since the end of the Second World War, the spread of industrialization and increases in"
  },
  {
    "n": 48,
    "question": "The trend in Graph 1 most directly led to which of the following?",
    "options": {
      "A": "International efforts to help newly independent nations address air pollution in their major cities",
      "B": "Debates regarding the causes and extent of humanity’s contributions to climate change",
      "C": "Binding international commitments to break up the big multinational energy companies",
      "D": "The growing popularity of nuclear power as an alternative energy source"
    },
    "answer": "B",
    "explanation": "The dramatic increase in carbon dioxide emissions in the second half of the twentieth century led to global debates regarding the connections between human-produced greenhouse gases and climate change. In some cases, these debates led to international agreements aimed at curbing carbon emissions, such as the Kyoto Protocol of 1997."
  },
  {
    "n": 49,
    "question": "The environmental processes illustrated by the two graphs are most closely associated with",
    "options": {
      "A": "An increase in biodiversity in many regions",
      "B": "A decline in soil fertility rates in many regions",
      "C": "An increase in epidemic diseases in many regions",
      "D": "A decline in air and water quality in many regions"
    },
    "answer": "D",
    "explanation": "The rise in the use of fossil fuels and the corresponding growth in carbon dioxide emissions is a key indicator of environmental pollution and is closely associated with deteriorating air and water quality in many regions."
  },
  {
    "n": 50,
    "question": "The trends for China and India in Graph 2 are best understood in the context of the",
    "options": {
      "A": "regional economic impact of the Great Leap Forward on industrial production",
      "B": "breakup of European colonial empires in the aftermath of the Second World War",
      "C": "shift of industrial production toward Asia beginning in the late twentieth century",
      "D": "efforts of international financial organizations to encourage greater cooperation among countries"
    },
    "answer": "C",
    "explanation": "Increased industrial production in the late twentieth century in Asia led directly to the greater use of fossil fuels in the region and resulted in China and India having higher shares of the global carbon dioxide emissions, as reflected in Graph 2."
  },
  {
    "n": 51,
    "question": "Which of the following historical events best explains why, in the period 1990–2000, the trends in carbon dioxide production in the United States and in Russia diverge, as shown in Graph 2 ?",
    "options": {
      "A": "While the United States economy mostly continued to grow, Russia’s economy contracted following the collapse of the Soviet Union.",
      "B": "While the United States increased its dependency on fossil fuels, Russia relied more on nuclear energy.",
      "C": "While the United States experienced the benefits of the Green Revolution, Russia experienced a decline in agricultural production.",
      "D": "While the United States relied on imports of oil and gas, Russia remained largely self-sufficient in energy production."
    },
    "answer": "A",
    "explanation": "The collapse of the Soviet Union brought about the end of the planned Soviet economy and led to significant economic dislocation. These events interrupted Soviet industrial production and lowered the Russian percentage of carbon dioxide emissions."
  },
  {
    "n": 52,
    "question": "The declaration can best be understood as a rejection of which of the following ideals?",
    "options": {
      "A": "The belief that some groups of people are inherently superior to others",
      "B": "The belief that all cultures have intrinsic value",
      "C": "The belief that race is a social construction",
      "D": "The belief that the concept of race has had a major impact on human interactions"
    },
    "answer": "A",
    "explanation": "The declaration expressly denies notions of racial superiority that had been promoted through policies to justify imperialism."
  },
  {
    "n": 53,
    "question": "The declaration’s mention of a “heavy toll” in the third paragraph was most likely a reference to which of the following?",
    "options": {
      "A": "The casualties of the First World War",
      "B": "The deaths that occurred as a result of the use of nuclear weapons during the Second World War",
      "C": "The deaths that occurred during the Holocaust",
      "D": "The mass violence that occurred under communist leaders, such as Mao Zedong"
    },
    "answer": "C",
    "explanation": "The deaths and suffering that occurred during the Holocaust took place during the 1940s, only a few years before the declaration was adopted, and were a result of Nazi racial policies. This makes it likely that the reference in the declaration is to the Holocaust."
  },
  {
    "n": 54,
    "question": "The declaration is an example of which of the following post-Second World War developments?",
    "options": {
      "A": "The creation of institutions to aid the economic development of newly independent nations",
      "B": "An increase in international migration in search of economic opportunities",
      "C": "The escalation of violence and proxy wars between countries during the Cold War",
      "D": "The efforts of international organizations to promote human rights"
    },
    "answer": "D",
    "explanation": "UNESCO, an agency of the United Nations, brought together representatives from many countries in an effort to promote human rights for all people and encourage international cooperation in the cultural sphere."
  },
  {
    "n": 55,
    "question": "All of the following statements are factually accurate. Which would most directly support the claim in the first paragraph that “Scientists have reached general agreement in recognizing that mankind is one: that all men belong to the same species, Homo sapiens”?",
    "options": {
      "A": "The declaration was signed in Paris, and UNESCO was a specialized agency of the United Nations.",
      "B": "South Africa’s government withdrew from UNESCO soon after the declaration on race was adopted.",
      "C": "The declaration was signed by experts from many countries with racially and culturally diverse populations.",
      "D": "The adoption of the declaration contributed to debates in Western countries on the question of race."
    },
    "answer": "C",
    "explanation": "The fact that the declaration was signed by experts from many countries with racially and culturally diverse populations would support the claim that the sentiments expressed in the paragraph represent the consensus position."
  }
]

// Scoring (source: scoring worksheet do 2020 Practice Exam 2)
//   Section I (MCQ):  numCorrect × 1.0181 = Section I Weighted
//   Section II (FRQ): SAQ×3 × 3.1111, DBQ × 5.0000, LEQ × 3.5000
//   Composite (0-140) maps to 1-5 AP Score:
export const AP_SCORE_BANDS = [
  { min: 98, max: 140, score: 5, label: "Excelente" },
  { min: 80, max: 97,  score: 4, label: "Muito bom" },
  { min: 61, max: 79,  score: 3, label: "Aprovado" },
  { min: 39, max: 60,  score: 2, label: "Abaixo" },
  { min: 0,  max: 38,  score: 1, label: "Insuficiente" },
] as const

export function mcqWeightedScore(numCorrect: number): number {
  return numCorrect * 1.0181
}

export function estimateAPScoreFromMcqOnly(numCorrect: number): {
  weightedMcq: number
  estimatedComposite: number
  apScore: 1 | 2 | 3 | 4 | 5
  label: string
  note: string
} {
  // The full composite includes FRQ (up to ~84 pts weighted). Estimating
  // only from MCQ: assume a median FRQ performance scaled to the user's MCQ
  // percentage. This is rough but useful as a self-assessment.
  const weightedMcq = mcqWeightedScore(numCorrect)
  const mcqPct = numCorrect / 55
  const estimatedFrq = Math.round(mcqPct * 84) // simulate FRQ at same level
  const estimatedComposite = Math.round(weightedMcq + estimatedFrq)
  const band = AP_SCORE_BANDS.find(b => estimatedComposite >= b.min && estimatedComposite <= b.max) ?? AP_SCORE_BANDS[AP_SCORE_BANDS.length - 1]
  return {
    weightedMcq: Math.round(weightedMcq * 10) / 10,
    estimatedComposite,
    apScore: band.score,
    label: band.label,
    note: "Estimativa baseada SÓ nas MCQs. A nota real do AP combina com a seção FRQ (redações/respostas curtas).",
  }
}
